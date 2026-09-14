const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: 'gate-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
}));

// Database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
    initDatabase();
  }
});

// Inicializar banco de dados
function initDatabase() {
  db.serialize(() => {
    // Tabela de usuários
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nome TEXT NOT NULL,
        cargo TEXT DEFAULT 'Agente',
        tipo TEXT DEFAULT 'agente',
        ativo INTEGER DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de hierarquia
    db.run(`
      CREATE TABLE IF NOT EXISTS hierarquia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rg INTEGER UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        patente TEXT NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de relatórios
    db.run(`
      CREATE TABLE IF NOT EXISTS relatorios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        data_inicio DATETIME NOT NULL,
        data_fim DATETIME NOT NULL,
        apreensoes TEXT,
        prisoes INTEGER DEFAULT 0,
        multas INTEGER DEFAULT 0,
        notas TEXT,
        comandante_rg INTEGER,
        comandante_nome TEXT,
        status TEXT DEFAULT 'pendente',
        aprovado_por INTEGER,
        data_aprovacao DATETIME,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY(aprovado_por) REFERENCES usuarios(id),
        FOREIGN KEY(comandante_rg) REFERENCES hierarquia(rg)
      )
    `);

    // Criar admin padrão
    db.run(`SELECT * FROM usuarios WHERE username = 'admin'`, (err, row) => {
      if (!row) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(`
          INSERT INTO usuarios (username, password, nome, cargo, tipo)
          VALUES (?, ?, ?, ?, ?)
        `, ['admin', hashedPassword, 'Administrador', 'Admin', 'admin']);
        console.log('✅ Admin padrão criado: admin / admin123');
      }
    });

    // Inserir hierarquia padrão
    db.run(`SELECT COUNT(*) as count FROM hierarquia`, (err, row) => {
      if (row.count === 0) {
        const hierarquiaInicial = [
          { rg: 298, nome: 'Tenente Coronel', patente: 'Tenente Coronel' },
          { rg: 5828, nome: 'Major Gusttavo Kallis', patente: 'Major' }
        ];

        hierarquiaInicial.forEach(h => {
          db.run(`
            INSERT INTO hierarquia (rg, nome, patente)
            VALUES (?, ?, ?)
          `, [h.rg, h.nome, h.patente]);
        });
        console.log('✅ Hierarquia padrão criada');
      }
    });
  });
}

// Rotas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM usuarios WHERE username = ?`, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro no servidor' });
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }

    req.session.usuario = {
      id: user.id,
      username: user.username,
      nome: user.nome,
      tipo: user.tipo,
      cargo: user.cargo
    };

    res.json({ sucesso: true, usuario: req.session.usuario });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ sucesso: true });
});

// Verificar se está logado
app.get('/api/usuario', (req, res) => {
  if (req.session.usuario) {
    res.json(req.session.usuario);
  } else {
    res.status(401).json({ erro: 'Não autenticado' });
  }
});

// ========== ROTAS DE HIERARQUIA ==========

// Listar hierarquia
app.get('/api/hierarquia', (req, res) => {
  db.all(`SELECT * FROM hierarquia ORDER BY rg ASC`, (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar hierarquia' });
    }
    res.json(rows || []);
  });
});

// Buscar agente por RG
app.get('/api/hierarquia/:rg', (req, res) => {
  const rg = req.params.rg;
  db.get(`SELECT * FROM hierarquia WHERE rg = ?`, [rg], (err, row) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar agente' });
    }
    if (!row) {
      return res.status(404).json({ erro: 'Agente não encontrado' });
    }
    res.json(row);
  });
});

// Criar agente na hierarquia (admin)
app.post('/api/hierarquia', (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  const { rg, nome, patente } = req.body;

  if (!rg || !nome || !patente) {
    return res.status(400).json({ erro: 'Campos obrigatórios: rg, nome, patente' });
  }

  db.run(`
    INSERT INTO hierarquia (rg, nome, patente)
    VALUES (?, ?, ?)
  `, [rg, nome, patente], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ erro: 'RG já existe' });
      }
      return res.status(500).json({ erro: 'Erro ao criar agente' });
    }
    res.json({ sucesso: true, id: this.lastID });
  });
});

// Atualizar agente na hierarquia (admin)
app.put('/api/hierarquia/:id', (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  const { nome, patente } = req.body;
  const id = req.params.id;

  db.run(`
    UPDATE hierarquia
    SET nome = ?, patente = ?
    WHERE id = ?
  `, [nome, patente, id], function(err) {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao atualizar agente' });
    }
    res.json({ sucesso: true });
  });
});

// Deletar agente da hierarquia (admin)
app.delete('/api/hierarquia/:id', (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  const id = req.params.id;

  db.run(`DELETE FROM hierarquia WHERE id = ?`, [id], function(err) {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao deletar agente' });
    }
    res.json({ sucesso: true });
  });
});

// ========== ROTAS DE RELATÓRIOS ==========

// Criar relatório
app.post('/api/relatorios', (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  const { data_inicio, data_fim, apreensoes, prisoes, multas, notas, comandante_rg } = req.body;

  // Se tem RG do comandante, busca o nome
  let query = `
    INSERT INTO relatorios (usuario_id, data_inicio, data_fim, apreensoes, prisoes, multas, notas, comandante_rg, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
  `;
  let params = [req.session.usuario.id, data_inicio, data_fim, apreensoes, prisoes, multas, notas, comandante_rg || null];

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao salvar relatório' });
    }

    // Se tem RG, busca o nome do comandante
    if (comandante_rg) {
      db.get(`SELECT nome FROM hierarquia WHERE rg = ?`, [comandante_rg], (err, row) => {
        if (row) {
          db.run(`UPDATE relatorios SET comandante_nome = ? WHERE id = ?`, [row.nome, this.lastID], () => {
            res.json({ sucesso: true, id: this.lastID });
          });
        } else {
          res.json({ sucesso: true, id: this.lastID });
        }
      });
    } else {
      res.json({ sucesso: true, id: this.lastID });
    }
  });
});

// Listar relatórios
app.get('/api/relatorios', (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }

  let query = `
    SELECT r.*, u.nome as usuario_nome 
    FROM relatorios r
    JOIN usuarios u ON r.usuario_id = u.id
  `;
  let params = [];

  if (req.session.usuario.tipo === 'agente') {
    query += ` WHERE r.usuario_id = ?`;
    params.push(req.session.usuario.id);
  }

  query += ` ORDER BY r.criado_em DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar relatórios' });
    }
    res.json(rows || []);
  });
});

// Aprovar/Rejeitar relatório
app.put('/api/relatorios/:id', (req, res) => {
  if (!req.session.usuario || req.session.usuario.tipo !== 'admin') {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  const { status } = req.body;
  const relatorio_id = req.params.id;

  if (!['aprovado', 'reprovado'].includes(status)) {
    return res.status(400).json({ erro: 'Status inválido' });
  }

  db.run(`
    UPDATE relatorios 
    SET status = ?, aprovado_por = ?, data_aprovacao = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, req.session.usuario.id, relatorio_id], function(err) {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao atualizar relatório' });
    }
    res.json({ sucesso: true });
  });
});

// Ranking
app.get('/api/ranking', (req, res) => {
  db.all(`
    SELECT u.id, u.nome, u.cargo,
           COUNT(r.id) as total_relatorios,
           SUM(CASE WHEN r.status = 'aprovado' THEN 1 ELSE 0 END) as relatorios_aprovados,
           SUM(CAST(r.prisoes AS INTEGER)) as total_prisoes,
           SUM(CAST(r.multas AS INTEGER)) as total_multas
    FROM usuarios u
    LEFT JOIN relatorios r ON u.id = r.usuario_id
    WHERE u.tipo = 'agente'
    GROUP BY u.id
    ORDER BY relatorios_aprovados DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro ao buscar ranking' });
    }
    res.json(rows || []);
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
