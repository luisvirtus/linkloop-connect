# Ações completas no painel administrativo

## Objetivo
Adicionar ações visíveis de incluir, alterar e excluir em Estoque, Clientes, Vendedores, Comercial, Configurações e Auditoria.

## Implementação

### Estoque
- Manter a geração de lotes como inclusão.
- Adicionar edição completa da plaquinha: status, vendedor, custo, preço e observações.
- Adicionar exclusão definitiva de plaquinha e lote, com confirmação e aviso dos dados relacionados removidos.

### Clientes
- Adicionar cadastro de empresa com seleção do responsável.
- Permitir alterar nome, site e responsável.
- Permitir exclusão definitiva da empresa, incluindo seus dados vinculados conforme as regras do banco.
- Preservar “Entrar como cliente”.

### Vendedores
- Unificar inclusão e edição em formulário próprio.
- Permitir alterar nome, e-mail, telefone e situação.
- Permitir exclusão definitiva, avisando que comissões relacionadas também serão removidas.

### Comercial
- Em cada aba, oferecer inclusão, alteração e exclusão dos registros correspondentes: vendas, assinaturas, pagamentos e comissões.
- Validar empresas, plaquinhas e vendedores selecionados, valores, datas e status.
- Atualizar os resumos financeiros imediatamente após cada operação.

### Configurações
- Manter a alteração dos parâmetros globais.
- Tratar “incluir” como restaurar/criar a configuração padrão caso o registro não exista.
- Oferecer restauração dos valores padrão no lugar de excluir o único registro necessário ao sistema.

### Auditoria
- Adicionar inclusão manual de observação administrativa e edição de observações manuais.
- Permitir exclusão definitiva de registros individuais.
- Manter ações automáticas protegidas contra alteração para não falsificar o histórico, mas permitir sua exclusão conforme solicitado.

## Segurança e experiência
- Todas as ações serão validadas no servidor como administrador e registradas na auditoria quando aplicável.
- Toda exclusão exigirá confirmação explícita e mostrará o impacto antes de executar.
- Os formulários terão estados de salvamento, erro e sucesso, e as listas serão atualizadas após cada ação.
- Usar os componentes e o visual existentes, com botões e ícones consistentes.

## Validação
- Conferir compilação e erros de execução.
- Testar inclusão, alteração e exclusão nas seis áreas em desktop e celular.
