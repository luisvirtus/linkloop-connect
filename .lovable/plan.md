# Melhorias em pagamentos, lotes e comissão de renovação

## Objetivo
Tornar a área Comercial mais clara e segura, identificar todos os campos da geração de lotes e garantir que cada renovação credite a comissão ao vendedor da venda original.

## Implementação

### Pagamentos em Comercial
- Reorganizar o cadastro e a edição com rótulos visíveis em todos os campos.
- Exigir empresa, tipo, valor e situação válidos; mostrar a assinatura ou venda relacionada conforme o tipo escolhido.
- Exibir na lista a referência vinculada, a data do pagamento e o vendedor que receberá comissão quando for renovação.
- Tornar a confirmação explícita, informando que ela marca o pagamento como pago, estende a assinatura por 12 meses e gera a comissão aplicável.
- Impedir confirmação incoerente ou duplicação de comissão e registrar o resultado na auditoria.

### Vínculo permanente do vendedor
- Registrar na assinatura o vendedor responsável pela venda original.
- Preencher esse vínculo automaticamente quando a plaquinha for vinculada e ao criar/alterar vendas ou assinaturas pelo administrador.
- Recuperar os vínculos existentes a partir da venda original ou da plaquinha, sem alterar comissões históricas.
- Usar exclusivamente o vendedor guardado na assinatura para gerar a comissão de renovação, evitando depender do vendedor atualmente atribuído à plaquinha.
- Permitir ao administrador visualizar e ajustar esse vendedor na assinatura quando necessário.

### Geração de lotes
- Adicionar nomes visíveis para Nome do lote, Quantidade, Tamanho, Custo unitário e Vendedor responsável.
- Manter descrições e validações claras, incluindo a informação de que o vendedor escolhido será atribuído às plaquinhas geradas.

## Segurança e integridade
- Validar todos os dados no servidor e manter as ações restritas ao administrador.
- Aplicar a alteração no banco com permissões existentes preservadas e dados atuais preenchidos.
- Manter pagamentos e comissões relacionados à assinatura, evitando criar uma segunda comissão ao confirmar novamente.

## Validação
- Conferir pagamentos pendentes, pagos e renovação com vendedor vinculado.
- Conferir inclusão e edição de assinatura e pagamento.
- Conferir os rótulos do lote em computador e celular.
- Validar compilação, erros de execução e consistência dos dados.
