# Impressão individual de plaquinhas

## Objetivo
Criar uma arte de impressão individual inspirada no modelo enviado, com QR permanente, chamada para avaliação no Google, cinco estrelas, instrução de leitura e identificação da empresa quando houver vínculo.

## Acesso por perfil
- **Cliente:** botão “Imprimir” em cada plaquinha vinculada no painel da empresa.
- **Vendedor:** botão “Imprimir” em cada plaquinha atribuída ao vendedor.
- **Administrador:** botão de impressão em cada linha do Estoque, além da impressão por lote já existente.
- Todos acessarão a mesma tela individual, mas a aplicação validará no servidor se aquela pessoa pode visualizar a plaquinha solicitada.

## Tela e arte
- Criar uma rota autenticada de impressão individual identificada pela plaquinha.
- Reproduzir o formato quadrado do exemplo: detalhes nas quatro cores, título “Avalie nossa empresa no Google”, cinco estrelas, QR central, seta/instrução e nome da empresa.
- Respeitar o tamanho cadastrado da plaquinha: 10×10, 15×15 ou 20×20 cm.
- Exibir uma prévia antes da impressão e um botão “Imprimir plaquinha”.
- Ocultar cabeçalho e controles no papel, imprimindo somente uma arte por página.

## Segurança e qualidade
- Cliente acessa somente plaquinhas de sua empresa; vendedor, somente as atribuídas a ele; administrador, qualquer plaquinha.
- Usar sempre a URL permanente `/q/CÓDIGO` no QR.
- Conferir a prévia e a impressão em computador e celular, além da compilação do aplicativo.
