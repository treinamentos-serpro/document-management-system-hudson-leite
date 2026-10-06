# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web simples para que usuários enviem documentos, consultem os documentos que enviaram e baixem esses arquivos posteriormente.

## 2. Escopo

### Dentro do escopo

- Envio de um arquivo por requisição.
- Listagem dos documentos associados ao usuário identificado na requisição.
- Download de um documento pelo identificador, permitido somente ao seu proprietário.
- Persistência dos arquivos no filesystem local da aplicação, em `backend/storage`, com `multer` e `diskStorage`.
- Armazenamento dos metadados em memória durante a execução do processo.
- Interface React para envio, listagem e download, consumindo a API via prefixo `/api`.
- Tratamento de erros de entrada, upload, armazenamento e consulta.

### Fora do escopo

- Provedores de armazenamento externos ou em nuvem.
- Banco de dados ou persistência durável dos metadados.
- Autenticação, autorização baseada em papéis ou cadastro completo de usuários.
- Versionamento, edição ou compartilhamento de documentos.
- Pastas, busca avançada e processamento do conteúdo dos arquivos.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento usando formulário multipart. | O servidor aceita um único arquivo no campo `file`, grava-o localmente e retorna seus metadados. |
| RF-02 | O servidor associa cada documento a um usuário. | O identificador do usuário é validado na requisição e salvo como `owner`. |
| RF-03 | O usuário pode listar seus documentos. | A resposta contém somente documentos cujo `owner` corresponda ao usuário da requisição; uma lista vazia é válida. |
| RF-04 | O usuário pode baixar um documento pelo identificador. | O servidor retorna o arquivo como download somente se ele existir e pertencer ao usuário solicitante. |
| RF-05 | A aplicação informa falhas de forma consistente. | Erros de validação, arquivo inexistente, acesso negado e falha de armazenamento retornam status HTTP e corpo JSON documentados. |
| RF-06 | A interface permite executar os fluxos principais. | O usuário consegue enviar um arquivo, consultar a lista atualizada e iniciar o download, com estados de carregamento e erro visíveis. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local usando `multer` com `diskStorage`; o diretório padrão é `backend/storage`. |
| RNF-02 | Os metadados ficam em memória e não sobrevivem à reinicialização do processo. |
| RNF-03 | Porta, diretório de armazenamento e limite máximo do arquivo são configuráveis por variáveis de ambiente. |
| RNF-04 | O backend usa Node.js, Express e CommonJS; os testes usam `node:test`. |
| RNF-05 | O frontend usa React, Vite e `fetch`; as chamadas do frontend usam `/api` e o proxy de desenvolvimento remove esse prefixo ao encaminhar para o backend. |
| RNF-06 | A aplicação não deve confiar no nome original do arquivo para criar caminhos no filesystem. O nome físico deve ser gerado pelo servidor. |
| RNF-07 | Falhas na leitura ou gravação de arquivos devem ser tratadas no limite do sistema, sem expor caminhos locais ou detalhes internos ao cliente. |

## 5. Modelo de dados

### Documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único gerado pelo servidor e usado nas consultas e downloads. |
| `originalName` | string | Sim | Nome original informado pelo cliente, preservado apenas como metadado e para o nome de download. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data e hora de recebimento do upload em formato ISO 8601. |
| `owner` | string | Sim | Identificador do usuário associado ao documento. |
| `storedName` | string | Sim, interno | Nome seguro gerado pelo servidor para localizar o arquivo no diretório de armazenamento. Não deve ser retornado pela API. |

Os registros de documento são mantidos em memória pelo repositório durante a vida do processo. O conteúdo fica no disco; o cliente não pode escolher nem fornecer `id`, `owner` ou `storedName`. O nome original é dado não confiável e não deve ser concatenado a um caminho de filesystem.

### Identificação do usuário no MVP

Como autenticação está fora do escopo, os contratos usam o cabeçalho `X-User-Id` para identificar o usuário. O backend deve rejeitar cabeçalho ausente ou vazio. Esse mecanismo é apenas uma convenção de desenvolvimento e não autentica a pessoa que faz a chamada; não deve ser considerado uma fronteira de segurança para produção.

## 6. Contratos de API

### Convenções

- Rotas do backend: `/upload`, `/documents` e `/documents/:id/download`.
- Chamadas feitas pelo frontend durante o desenvolvimento: mesmas rotas com o prefixo `/api`, por exemplo `/api/documents`.
- Cabeçalho de usuário: `X-User-Id: <identificador>` em todas as rotas de documentos.
- Corpo de erro comum: `{ "error": { "code": "...", "message": "..." } }`.
- Respostas JSON usam `Content-Type: application/json`; download retorna conteúdo binário.

### `POST /upload`

Recebe um arquivo e cria um registro de documento.

- Cabeçalho: `X-User-Id` obrigatório.
- Corpo: `multipart/form-data`, com exatamente um arquivo no campo `file`.
- Sucesso: `201 Created` e objeto JSON do documento, sem `storedName`.

Exemplo de resposta:

```json
{
  "id": "<id gerado>",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "<identificador do usuário>"
}
```

Erros esperados:

| Status | Código sugerido | Condição |
| --- | --- | --- |
| `400` | `INVALID_UPLOAD` | Arquivo ausente, campo incorreto ou requisição multipart inválida. |
| `400` | `USER_REQUIRED` | Cabeçalho `X-User-Id` ausente ou vazio. |
| `413` | `FILE_TOO_LARGE` | Arquivo maior que o limite configurado. |
| `500` | `STORAGE_ERROR` | Não foi possível gravar o arquivo ou registrar os metadados. |

O limite de tamanho deve ser configurável por ambiente. A especificação não fixa um valor padrão; ele deve ser definido na configuração de implantação e aplicado pelo middleware de upload.

### `GET /documents`

Lista os documentos pertencentes ao usuário solicitante.

- Cabeçalho: `X-User-Id` obrigatório.
- Sucesso: `200 OK` com `{ "documents": [...] }`.
- A lista vazia deve retornar `200` com `documents` igual a `[]`.
- Cada item contém `id`, `originalName`, `size`, `uploadedAt` e `owner`; `storedName` nunca é exposto.
- Erro: `400 USER_REQUIRED` se o cabeçalho estiver ausente ou vazio.

### `GET /documents/:id/download`

Transfere o conteúdo binário do documento solicitado.

- Cabeçalho: `X-User-Id` obrigatório.
- Sucesso: `200 OK`, com o conteúdo do arquivo, `Content-Type` apropriado quando conhecido e `Content-Disposition: attachment` com o nome original devidamente codificado.
- Erro: `400 USER_REQUIRED` se o cabeçalho estiver ausente ou vazio.
- Erro: `404 DOCUMENT_NOT_FOUND` se o identificador não existir, não pertencer ao usuário ou se o arquivo local correspondente não estiver disponível. A resposta não deve revelar se um documento de outro usuário existe.
- Erro: `500 STORAGE_ERROR` para falhas inesperadas de leitura, sem expor caminhos internos.

## 7. Decisões arquiteturais

### Backend

O backend segue Clean Architecture simples, sem dependência de bibliotecas ou serviços externos além dos já previstos no projeto. O fluxo de dependência é `routes -> controllers -> services -> repositories`.

| Camada | Responsabilidade |
| --- | --- |
| `routes/` | Registrar métodos e caminhos HTTP e encaminhar a requisição ao controller correspondente. |
| `controllers/` | Ler parâmetros, cabeçalhos e arquivo recebido; aplicar validação básica; traduzir resultados e erros para respostas HTTP. |
| `services/` | Implementar regras de negócio, incluindo associação ao proprietário, filtragem da listagem e autorização do download. |
| `repositories/` | Persistir e recuperar metadados em memória e acessar arquivos locais. O acesso ao filesystem e os detalhes de armazenamento ficam encapsulados nesta camada. |

As camadas internas não conhecem Express nem objetos de requisição/resposta HTTP. O `multer` com `diskStorage` é configurado no limite de entrada do backend e grava no diretório local configurado; nomes físicos são gerados pelo servidor. A limpeza de um arquivo gravado quando o registro de metadados falhar deve ser considerada para evitar arquivos órfãos.

### Frontend

O frontend mantém componentes funcionais React e separa a interface do acesso HTTP. A comunicação usa `fetch` via `/api`, conforme o proxy já configurado no Vite. Componentes de interface não acessam diretamente o filesystem nem conhecem os detalhes de persistência.

### Configuração e armazenamento

- `PORT`: porta do Express; padrão atual do seed: `3000`.
- `STORAGE_DIR`: diretório de arquivos; padrão: `backend/storage`.
- `MAX_FILE_SIZE`: limite de upload em bytes, configurado pelo ambiente.
- Metadados permanecem em memória. Uma reinicialização perde os registros, mesmo que os arquivos ainda estejam no disco; reconciliação ou persistência durável não fazem parte desta versão.

## 8. Plano de execução

As etapas abaixo são planejamento futuro. Esta especificação não implementa nem altera arquivos de backend ou frontend.

1. **Configuração e contratos do backend:** definir configuração de ambiente e formato comum de erros; preparar testes de configuração e validação dos contratos.
2. **Persistência local e metadados:** implementar o repositório de documentos com metadados em memória e arquivos em `backend/storage`, usando `multer` com `diskStorage`; testar gravação, consulta, isolamento por usuário e falhas de filesystem.
3. **Fluxo de upload:** adicionar rota, controller e serviço para validar usuário e arquivo, aplicar limite configurado, salvar metadados e responder `201`; testar arquivo ausente, limite excedido e falha de gravação.
4. **Listagem e download:** implementar rotas, controllers e serviços para listar somente documentos do proprietário e transferir o arquivo local autorizado; testar lista vazia, documento ausente, isolamento entre usuários e falhas de leitura.
5. **Interface de usuário:** implementar serviço de API e componentes React para upload, listagem e download, com estados de carregamento, sucesso e erro; validar uso do proxy `/api`.
6. **Integração e regressão:** executar testes do backend e build do frontend; verificar os três fluxos de ponta a ponta, cabeçalhos, respostas de erro e a restrição de armazenamento exclusivamente local.

## 9. Critérios de aceite do produto

- Um usuário identificado consegue enviar um arquivo dentro do limite configurado e recebe seus metadados.
- A listagem retorna somente os documentos associados ao usuário e funciona quando não há resultados.
- O proprietário consegue baixar o conteúdo do arquivo usando seu identificador.
- Outro usuário não consegue listar nem baixar documentos alheios.
- Arquivos são gravados apenas no diretório local configurado; metadados não são apresentados como persistentes após reinício.
- A interface consome a API pelo proxy `/api` e comunica falhas de forma compreensível.
- Testes cobrem os fluxos de sucesso, validação, autorização e falhas de armazenamento.