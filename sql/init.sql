CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  cidade VARCHAR(80) NOT NULL
);

CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE produtos (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nome VARCHAR(140) NOT NULL,
  descricao TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  minimo INTEGER NOT NULL,
  localizacao VARCHAR(80) NOT NULL,
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  status VARCHAR(30) NOT NULL,
  canal VARCHAR(30) NOT NULL,
  entrega_em DATE NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pedido_itens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(10, 2) NOT NULL
);

CREATE TABLE avaliacoes (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT NOT NULL,
  criado_em DATE NOT NULL
);

INSERT INTO clientes (nome, telefone, cidade) VALUES
('Ana Ribeiro', '(71) 98811-2101', 'Salvador'),
('Mateus Cardoso', '(71) 97722-3302', 'Lauro de Freitas'),
('Clara Santana', '(71) 96633-4403', 'Camaçari'),
('Rosa Almeida', '(71) 95544-5504', 'Salvador'),
('Iago Moreira', '(71) 94455-6605', 'Simões Filho');

INSERT INTO categorias (nome) VALUES
('Buquês'),
('Arranjos'),
('Orquídeas'),
('Cestas');

INSERT INTO produtos (categoria_id, nome, descricao, preco, ativo) VALUES
(1, 'Buquê Aurora', 'Rosas champanhe, astromélias e folhagens em papel kraft.', 129.90, TRUE),
(1, 'Buquê Jardim Solar', 'Girassóis, margaridas e flores do campo para presente alegre.', 99.90, TRUE),
(2, 'Arranjo Serenata', 'Lírios brancos, rosas vermelhas e base de cerâmica.', 189.50, TRUE),
(2, 'Arranjo Mesa Verde', 'Suculentas, musgos e folhagens para decoração de mesa.', 79.90, TRUE),
(3, 'Orquídea Phalaenopsis Lilás', 'Orquídea plantada em cachepô de madeira.', 149.00, TRUE),
(3, 'Orquídea Branca Premium', 'Orquídea branca de haste dupla com embalagem para presente.', 179.00, TRUE),
(4, 'Cesta Café Florido', 'Cesta de café da manhã com mini buquê de flores do campo.', 219.90, TRUE),
(4, 'Cesta Afeto', 'Chocolates, vinho suave e rosas vermelhas.', 259.90, TRUE);

INSERT INTO estoque (produto_id, quantidade, minimo, localizacao, atualizado_em) VALUES
(1, 18, 8, 'Câmara fria A', NOW() - INTERVAL '2 hours'),
(2, 6, 10, 'Câmara fria A', NOW() - INTERVAL '1 hour'),
(3, 11, 5, 'Ateliê central', NOW() - INTERVAL '3 hours'),
(4, 4, 6, 'Bancada de montagem', NOW() - INTERVAL '30 minutes'),
(5, 9, 4, 'Vitrine climatizada', NOW() - INTERVAL '4 hours'),
(6, 3, 5, 'Vitrine climatizada', NOW() - INTERVAL '45 minutes'),
(7, 12, 6, 'Estoque seco', NOW() - INTERVAL '5 hours'),
(8, 5, 5, 'Estoque seco', NOW() - INTERVAL '2 hours');

INSERT INTO pedidos (cliente_id, status, canal, entrega_em, criado_em) VALUES
(1, 'novo', 'dashboard', CURRENT_DATE + INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
(2, 'em_preparo', 'whatsapp', CURRENT_DATE + INTERVAL '2 days', NOW() - INTERVAL '5 hours'),
(3, 'saiu_para_entrega', 'loja', CURRENT_DATE, NOW() - INTERVAL '1 day'),
(4, 'entregue', 'dashboard', CURRENT_DATE - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
(5, 'cancelado', 'whatsapp', CURRENT_DATE + INTERVAL '3 days', NOW() - INTERVAL '2 days');

INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario) VALUES
(1, 1, 1, 129.90),
(1, 7, 1, 219.90),
(2, 3, 2, 189.50),
(3, 2, 1, 99.90),
(3, 5, 1, 149.00),
(4, 8, 1, 259.90),
(5, 6, 1, 179.00);

INSERT INTO avaliacoes (produto_id, cliente_id, nota, comentario, criado_em) VALUES
(1, 1, 5, 'Buquê muito delicado e entrega pontual.', CURRENT_DATE - INTERVAL '4 days'),
(2, 3, 4, 'Flores bonitas, poderia ter mais girassóis.', CURRENT_DATE - INTERVAL '6 days'),
(3, 2, 5, 'Arranjo elegante para recepção.', CURRENT_DATE - INTERVAL '8 days'),
(5, 4, 5, 'Orquídea saudável e embalagem caprichada.', CURRENT_DATE - INTERVAL '3 days'),
(6, 5, 3, 'Produto lindo, mas uma flor chegou amassada.', CURRENT_DATE - INTERVAL '2 days'),
(7, 1, 4, 'Cesta bem montada e com flores frescas.', CURRENT_DATE - INTERVAL '7 days'),
(8, 2, 5, 'Excelente composição para aniversário.', CURRENT_DATE - INTERVAL '1 day'),
(1, 4, 4, 'Gostei da combinação das cores.', CURRENT_DATE - INTERVAL '9 days');
