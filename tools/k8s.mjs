import { spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { qaTool } from './qa-tool.mjs';
const action = process.argv[2] || 'doctor',
  kubeconfig = resolve('.tools/kubeconfig-qa.yaml'),
  context = 'kind-saldo-qa',
  namespace = 'saldo-qa';
mkdirSync('reports/k8s', { recursive: true });
const args = ['--kubeconfig', kubeconfig, '--context', context, '--namespace', namespace];
function command(bin, argv, capture = false) {
  const r = spawnSync(bin, argv, { encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (r.status !== 0)
    throw new Error(`${bin} ${argv.join(' ')}: ${r.error?.message || r.stderr || 'falhou'}`);
  return r.stdout;
}
function blocked(reason) {
  writeFileSync(
    'reports/k8s/status.json',
    JSON.stringify({ status: 'blocked', reason, at: new Date().toISOString() }, null, 2),
  );
  console.error('BLOQUEADO: ' + reason);
  process.exitCode = 2;
  return false;
}
function runtime() {
  const docker = spawnSync('docker', ['info', '--format', '{{json .ServerVersion}}'], {
    encoding: 'utf8',
  });
  let virtualization = null;
  if (process.platform === 'win32') {
    const check = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        '(Get-CimInstance Win32_Processor | Select-Object -First 1).VirtualizationFirmwareEnabled',
      ],
      { encoding: 'utf8' },
    );
    virtualization = check.stdout?.trim() === 'True';
  }
  const result = {
    dockerReady: docker.status === 0,
    virtualizationFirmwareEnabled: virtualization,
    detail: docker.error?.message || docker.stderr || docker.stdout,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync('reports/k8s/preflight.json', JSON.stringify(result, null, 2));
  return result;
}
function ensureCluster() {
  if (!existsSync(kubeconfig))
    return blocked(
      'Cluster local não criado. Execute qa:cluster:create após habilitar virtualização e instalar Docker/WSL2.',
    );
  try {
    command(qaTool('kubectl'), [...args, 'cluster-info'], true);
    return true;
  } catch (error) {
    return blocked(error.message);
  }
}
if (action === 'doctor') {
  const r = runtime();
  if (!r.dockerReady)
    blocked(
      'Docker não disponível; virtualização no firmware: ' +
        r.virtualizationFirmwareEnabled +
        '. Consulte docs/KUBERNETES-K9S.md.',
    );
  else
    console.log('Docker pronto. Cluster ' + (existsSync(kubeconfig) ? 'configurado.' : 'a criar.'));
} else if (action === 'create') {
  const r = runtime();
  if (!r.dockerReady)
    blocked(
      'Não é possível criar Kind sem Docker ativo. Virtualização no firmware: ' +
        r.virtualizationFirmwareEnabled,
    );
  else {
    if (existsSync(kubeconfig)) {
      console.log('Kubeconfig local existente; validando.');
      ensureCluster();
    } else
      command(qaTool('kind'), [
        'create',
        'cluster',
        '--name',
        'saldo-qa',
        '--config',
        'infra/k8s/kind.yaml',
        '--kubeconfig',
        kubeconfig,
        '--wait',
        '120s',
      ]);
  }
} else if (action === 'deploy') {
  if (ensureCluster()) {
    command('docker', ['build', '-f', 'infra/docker/Dockerfile', '-t', 'saldo-qa:local', '.']);
    command(qaTool('kind'), ['load', 'docker-image', 'saldo-qa:local', '--name', 'saldo-qa']);
    command(qaTool('kubectl'), [...args, 'apply', '-f', 'infra/k8s/namespace.yaml']);
    command(qaTool('kubectl'), [...args, 'apply', '-f', 'infra/k8s/saldo.yaml']);
    command(qaTool('kubectl'), [
      ...args,
      'rollout',
      'status',
      'deployment/saldo-web',
      '--timeout=120s',
    ]);
    console.log('Saldo QA: http://127.0.0.1:8787');
  }
} else if (action === 'integration') {
  if (ensureCluster()) {
    try {
      const deployment = JSON.parse(
        command(qaTool('kubectl'), [...args, 'get', 'deployment', 'saldo-web', '-o', 'json'], true),
      );
      const pods = JSON.parse(
        command(
          qaTool('kubectl'),
          [...args, 'get', 'pods', '-l', 'app=saldo-web', '-o', 'json'],
          true,
        ),
      );
      const service = JSON.parse(
        command(qaTool('kubectl'), [...args, 'get', 'service', 'saldo-web', '-o', 'json'], true),
      );
      const checks = {
        deploymentReady: deployment.status.readyReplicas === 2,
        podsReady:
          pods.items.length === 2 &&
          pods.items.every(
            (p) =>
              p.status.phase === 'Running' && p.status.containerStatuses?.every((c) => c.ready),
          ),
        servicePort: service.spec.ports.some((p) => p.nodePort === 30080 && p.targetPort === 8080),
      };
      const health = await fetch('http://127.0.0.1:8787/healthz', {
        signal: AbortSignal.timeout(10000),
      });
      checks.health = health.status === 200 && (await health.text()) === 'OK';
      const home = await fetch('http://127.0.0.1:8787/', { signal: AbortSignal.timeout(10000) });
      checks.home = home.status === 200 && (await home.text()).includes('Saldo');
      const passed = Object.values(checks).every(Boolean);
      writeFileSync(
        'reports/k8s/integration.json',
        JSON.stringify(
          { status: passed ? 'passed' : 'failed', checks, at: new Date().toISOString() },
          null,
          2,
        ),
      );
      if (!passed)
        throw new Error(
          'Contrato de integração Kubernetes reprovado. Veja reports/k8s/integration.json.',
        );
      console.log('Deployment, pods, service e HTTP reais aprovados.');
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
} else if (action === 'collect') {
  if (ensureCluster()) {
    for (const resource of ['pods', 'deployments', 'services', 'events'])
      writeFileSync(
        `reports/k8s/${resource}.json`,
        command(qaTool('kubectl'), [...args, 'get', resource, '-o', 'json'], true),
      );
    writeFileSync(
      'reports/k8s/logs.txt',
      command(
        qaTool('kubectl'),
        [...args, 'logs', '-l', 'app=saldo-web', '--tail=200', '--all-containers=true'],
        true,
      ),
    );
    writeFileSync(
      'reports/k8s/status.json',
      JSON.stringify(
        { status: 'collected', context, namespace, at: new Date().toISOString() },
        null,
        2,
      ),
    );
  }
} else if (action === 'k9s') {
  if (ensureCluster()) {
    const child = spawn(
      qaTool('k9s'),
      [
        '--kubeconfig',
        kubeconfig,
        '--context',
        context,
        '--namespace',
        namespace,
        '--readonly',
        '--command',
        'pods',
      ],
      { stdio: 'inherit' },
    );
    process.exitCode = await new Promise((r, reject) => {
      child.on('exit', (c) => r(c ?? 1));
      child.on('error', reject);
    });
  }
} else if (action === 'web' || action === 'load') {
  if (ensureCluster()) {
    const env = {
      ...process.env,
      QA_BASE_URL: 'http://127.0.0.1:8787',
      BASE_URL: 'http://127.0.0.1:8787',
    };
    const cli = action === 'web' ? resolve('node_modules/@playwright/test/cli.js') : 'tools/k6.mjs';
    const child = spawn(process.execPath, [cli, ...(action === 'web' ? ['test'] : ['load'])], {
      stdio: 'inherit',
      env,
    });
    process.exitCode = await new Promise((r, reject) => {
      child.on('exit', (c) => r(c ?? 1));
      child.on('error', reject);
    });
  }
} else if (action === 'validate') {
  const { parseAllDocuments } = await import('yaml');
  const docs = ['infra/k8s/kind.yaml', 'infra/k8s/namespace.yaml', 'infra/k8s/saldo.yaml'].flatMap(
    (file) =>
      parseAllDocuments(readFileSync(file, 'utf8')).map((d) => {
        if (d.errors.length) throw new Error(d.errors.join('\n'));
        return d.toJSON();
      }),
  );
  const deploy = docs.find((d) => d.kind === 'Deployment'),
    service = docs.find((d) => d.kind === 'Service');
  if (
    deploy.metadata.namespace !== namespace ||
    service.metadata.namespace !== namespace ||
    deploy.spec.selector.matchLabels.app !== service.spec.selector.app ||
    service.spec.ports[0].nodePort !== 30080
  )
    throw new Error('Contratos Kubernetes inconsistentes.');
  writeFileSync(
    'reports/k8s/manifests-validation.json',
    JSON.stringify(
      { status: 'passed', scope: 'static only; no cluster execution', resources: docs.length },
      null,
      2,
    ),
  );
  console.log(
    'YAML, namespace e contratos Deployment/Service verificados localmente. Não equivale a deploy aprovado.',
  );
} else throw new Error('Ação de cluster desconhecida.');
