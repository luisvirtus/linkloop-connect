# Completar telas administrativas

## Objetivo
Entregar as quatro áreas restantes do painel com informações claras, estados de carregamento/erro/vazio e ações administrativas funcionais, mantendo o visual atual do Plaquinhas QR.

## Implementação

### Comercial
- Organizar Vendas, Assinaturas, Pagamentos e Comissões em abas responsivas.
- Exibir resumos financeiros no topo e tabelas com nomes/status em português.
- Permitir confirmar pagamentos pendentes e marcar comissões como pagas, com confirmação visual e bloqueio durante o processamento.
- Adicionar estados vazios, carregamento e erro em cada aba.

### Configurações
- Criar formulário administrativo para preço, custo, anuidade e percentuais de comissão.
- Validar valores monetários e percentuais antes de salvar.
- Informar claramente impacto dos valores e mostrar sucesso/erro sem perder os dados preenchidos.

### Auditoria
- Exibir histórico com data, responsável, ação, entidade e detalhes legíveis.
- Adicionar busca e filtros por ação/responsável no próprio conjunto carregado.
- Tratar detalhes técnicos em uma visualização expansível, evitando texto truncado sem acesso ao conteúdo.

### Entrar como cliente
- Ligar a ação da lista de clientes à rota administrativa dedicada `/admin/cliente/$companyId`.
- Fazer essa rota abrir o painel real do cliente em modo de suporte, com faixa persistente de aviso e retorno seguro à lista.
- Registrar o acesso na auditoria e impedir acesso por usuários sem perfil administrador.
- Evitar duplicação da tela do cliente reutilizando o fluxo já existente em `/painel?companyId=...` por redirecionamento administrativo seguro.

## Qualidade e segurança
- Usar os componentes e tokens visuais existentes.
- Preservar a validação administrativa no servidor para todas as leituras e ações.
- Completar metadados próprios da rota “Entrar como cliente”.
- Validar compilação e testar a navegação e os principais estados no navegador em desktop e mobile.
