# Kubernetes local e interação com K9s

## Pré-requisitos

Instale as ferramentas locais com `qa:tools:setup`. O cluster de QA depende de
Docker ativo, Linux containers e, no Windows, WSL2, virtualização habilitada e uma
versão do sistema suportada pelo Docker Desktop. Use `qa:cluster:doctor` para
verificar o seu ambiente. `blocked` é um diagnóstico de pré-requisito ausente,
não um resultado de teste aprovado.

## Preparação do computador

1. Habilite virtualização AMD-V/SVM no firmware, conforme o manual da placa-mãe.
2. Atualize o Windows para uma versão suportada pelo Docker Desktop.
3. Em terminal administrativo, prepare WSL2 conforme a documentação oficial:

```powershell
wsl --install --no-distribution
```

Reinicie quando o Windows solicitar. Depois atualize WSL e instale Docker Desktop:

```powershell
wsl --update
winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
```

Abra Docker Desktop e conclua a configuração do backend WSL2 / Linux containers.
Confira `docker info` no terminal. O instalador pode exigir ação administrativa;
os comandos do projeto não alteram BIOS nem reiniciam o computador.

## Criar e publicar somente no cluster local

Na raiz do projeto:

```powershell
.\saldo.cmd qa:tools:setup
.\saldo.cmd qa:cluster:doctor
.\saldo.cmd qa:cluster:validate
.\saldo.cmd qa:cluster:create
.\saldo.cmd qa:cluster:deploy
```

A criação usa Kind com nome `saldo-qa`, um nó local, namespace `saldo-qa` e
kubeconfig isolado em `.tools/kubeconfig-qa.yaml`. Nenhum comando usa implicitamente
o contexto atual do seu kubeconfig pessoal. A imagem `saldo-qa:local` contém apenas
os presets fictícios do modo QA. O Dockerfile exclui o arquivo de dados financeiros
pessoais do contexto e usa `build:qa`.

O serviço fica em `http://127.0.0.1:8787`; o mapeamento escuta somente localhost.
São dois pods Nginx, com probes `/healthz`, limites de recursos e usuário não root.
A imagem não é enviada a registry: `kind load docker-image` a carrega localmente.

Em clone limpo, `.tools/bin` é preenchido novamente por `qa:tools:setup`.
O runtime Docker é um pré-requisito separado, não é instalado pelo setup das CLIs.

## Interagir pelo K9s

Execute em um terminal interativo:

```powershell
.\saldo.cmd qa:k9s
```

O comando abre K9s diretamente em pods, no contexto e namespace de QA, em modo
somente leitura. As teclas de navegação são reais do K9s:

- `:pods` + Enter: listar pods; selecione um pod com as setas.
- `l`: abrir logs do pod selecionado; Esc retorna.
- `d`: detalhes/describe; `y`: manifesto YAML do recurso.
- `:deploy` + Enter: acompanhar Deployment e réplicas prontas.
- `:svc` + Enter: verificar o Service.
- `:events` + Enter: inspecionar eventos de criação, probe e scheduling.
- `/saldo`: filtrar nomes; `:q` encerra.

Quando o k6 estiver rodando, observe os logs HTTP e a disponibilidade dos pods.
CPU/memória no K9s dependem de metrics-server, que não é instalado por este fluxo;
a ausência dessas métricas não é convertida em zero nem considerada teste aprovado.

## Executar a bateria e o k6 contra Kubernetes

```powershell
.\saldo.cmd qa:cluster:integration
.\saldo.cmd qa:cluster:web
.\saldo.cmd qa:cluster:k6
.\saldo.cmd qa:cluster:collect
```

`qa:cluster:web` executa a matriz Playwright completa contra o NodePort, sem iniciar
Vite. `qa:cluster:k6` executa o perfil de carga no mesmo alvo. `collect` salva pods,
deployments, services, events e logs em `reports/k8s/`.

Se o cluster não existe ou não está acessível, os comandos terminam com código 2,
registrando `blocked`; não geram aprovação artificial ou evidências de pods fictícios.
A coleta deve ser repetida antes/depois da carga para comparar eventos e reinícios.
A comparação manual de contadores do pod complementa as métricas HTTP do k6.

O K9s é uma interface de operação do cluster. Os testes repetíveis usam a API
Kubernetes via kubectl e o endereço real do serviço; não simulam Kubernetes dentro
do dashboard financeiro. Imagens/vídeos web estão na galeria, e a operação K9s
exige o cluster disponível para produzir uma gravação real do terminal.

## Referências oficiais

- [Kind e runtime de containers](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [Instalação K9s](https://k9scli.io/topics/install/)
- [Comandos K9s](https://k9scli.io/topics/commands/)
- [Requisitos Docker Desktop Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [kubectl Windows](https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/)

`qa:cluster:integration` verifica duas réplicas prontas, containers saudáveis, NodePort, `/healthz` e HTML reais, salvando `reports/k8s/integration.json` apenas após consultar o cluster.
