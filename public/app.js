// Gerenciamento de estado e navegação
let usuarioLogado = null;

// Inicializar app
document.addEventListener('DOMContentLoaded', () => {
    verificarLogin();
});

// Verificar se usuário está logado
async function verificarLogin() {
    try {
        const response = await fetch('/api/usuario');
        if (response.ok) {
            usuarioLogado = await response.json();
            mostrarApp();
        } else {
            mostrarLogin();
        }
    } catch (error) {
        console.error('Erro ao verificar login:', error);
        mostrarLogin();
    }
}

// Mostrar página de login
function mostrarLogin() {
    document.getElementById('app').innerHTML = `
        <div class="login-container">
            <div class="login-box">
                <h1>GATE</h1>
                <p>Portal Operacional</p>
                <form onsubmit="fazerLogin(event)">
                    <div class="form-group">
                        <label for="username">Usuário</label>
                        <input type="text" id="username" name="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Senha</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <button type="submit">Entrar</button>
                    <div id="erro" class="error-message"></div>
                </form>
            </div>
        </div>
    `;
}

// Fazer login
async function fazerLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const erroDiv = document.getElementById('erro');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            usuarioLogado = await response.json().then(r => r.usuario);
            mostrarApp();
        } else {
            const erro = await response.json();
            erroDiv.textContent = erro.erro || 'Erro ao fazer login';
        }
    } catch (error) {
        erroDiv.textContent = 'Erro na conexão';
    }
}

// Mostrar app principal
function mostrarApp() {
    const tipoUsuario = usuarioLogado.tipo;
    
    document.getElementById('app').innerHTML = `
        <div class="container">
            <aside class="sidebar">
                <div class="sidebar-logo">
                    <span>🚔</span>
                    <h2>GATE</h2>
                </div>
                <ul class="sidebar-menu">
                    <li><a href="#" onclick="irPara('dashboard', event)" class="menu-link active" data-page="dashboard">
                        <span>📊</span> Dashboard
                    </a></li>
                    ${tipoUsuario === 'admin' ? `
                        <li><a href="#" onclick="irPara('relatorios', event)" class="menu-link" data-page="relatorios">
                            <span>📋</span> Relatórios
                        </a></li>
                        <li><a href="#" onclick="irPara('ranking', event)" class="menu-link" data-page="ranking">
                            <span>📈</span> Ranking
                        </a></li>
                        <li><a href="#" onclick="irPara('agentes', event)" class="menu-link" data-page="agentes">
                            <span>👮</span> Agentes
                        </a></li>
                    ` : `
                        <li><a href="#" onclick="irPara('meus-relatorios', event)" class="menu-link" data-page="meus-relatorios">
                            <span>📋</span> Meus Relatórios
                        </a></li>
                        <li><a href="#" onclick="irPara('novo-relatorio', event)" class="menu-link" data-page="novo-relatorio">
                            <span>➕</span> Novo Relatório
                        </a></li>
                    `}
                    <li><a href="#" onclick="irPara('regras', event)" class="menu-link" data-page="regras">
                        <span>📜</span> Regras
                    </a></li>
                    <li><a href="#" onclick="irPara('viaturas', event)" class="menu-link" data-page="viaturas">
                        <span>🚗</span> Viaturas
                    </a></li>
                    <li><a href="#" onclick="fazerLogout()" class="menu-link">
                        <span>🚪</span> Sair
                    </a></li>
                </ul>
            </aside>

            <div class="main-content">
                <div class="header">
                    <div class="header-title">
                        <h1>GATE - Portal Operacional</h1>
                        <p>Bem-vindo, ${usuarioLogado.nome}</p>
                    </div>
                    <div class="header-actions">
                        <div class="profile-section">
                            <div class="profile-avatar">${usuarioLogado.nome.charAt(0)}</div>
                            <div>
                                <p style="font-size: 14px; color: var(--text-primary);">${usuarioLogado.nome}</p>
                                <p style="font-size: 12px; color: var(--text-secondary);">${usuarioLogado.cargo}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="content">
                    <div id="dashboard" class="page active">
                        ${tipoUsuario === 'admin' ? pagina_dashboard_admin() : pagina_dashboard_agente()}
                    </div>
                    <div id="relatorios" class="page"></div>
                    <div id="ranking" class="page"></div>
                    <div id="agentes" class="page"></div>
                    <div id="meus-relatorios" class="page"></div>
                    <div id="novo-relatorio" class="page"></div>
                    <div id="regras" class="page"></div>
                    <div id="viaturas" class="page"></div>
                </div>
            </div>
        </div>
    `;
}

// Navegação entre páginas
function irPara(pagina, event) {
    event.preventDefault();
    
    // Remover classe active de todos os links e páginas
    document.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Adicionar classe active ao link clicado
    event.target.closest('.menu-link').classList.add('active');
    
    // Mostrar página
    const pageElement = document.getElementById(pagina);
    pageElement.classList.add('active');
    
    // Carregar conteúdo específico
    switch(pagina) {
        case 'relatorios':
            carregarRelatorios();
            break;
        case 'ranking':
            carregarRanking();
            break;
        case 'meus-relatorios':
            carregarMeusRelatorios();
            break;
        case 'novo-relatorio':
            pageElement.innerHTML = formulario_novo_relatorio();
            break;
        case 'regras':
            pageElement.innerHTML = pagina_regras();
            break;
        case 'viaturas':
            pageElement.innerHTML = pagina_viaturas();
            break;
    }
}

// Dashboard Admin
function pagina_dashboard_admin() {
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Relatórios Pendentes</div>
                <div class="stat-value" id="pendentes-count">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Relatórios Aprovados</div>
                <div class="stat-value" id="aprovados-count">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total de Agentes</div>
                <div class="stat-value" id="agentes-count">0</div>
            </div>
        </div>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Últimos Relatórios</h3>
            </div>
            <div id="ultimos-relatorios"></div>
        </div>
    `;
}

// Dashboard Agente
function pagina_dashboard_agente() {
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Meus Relatórios</div>
                <div class="stat-value" id="meus-count">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Aprovados</div>
                <div class="stat-value" id="aprovados-agente">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pendentes</div>
                <div class="stat-value" id="pendentes-agente">0</div>
            </div>
        </div>
        <button class="btn btn-primary" onclick="document.getElementById('novo-relatorio').click(); irPara('novo-relatorio', {preventDefault: () => {}})">
            ➕ Criar Novo Relatório
        </button>
    `;
}

// Formulário de novo relatório
function formulario_novo_relatorio() {
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Novo Relatório de Patrulhamento</h3>
            </div>
            <form onsubmit="salvarRelatorio(event)">
                <div class="form-group">
                    <label>Data Início</label>
                    <input type="datetime-local" id="data_inicio" required>
                </div>
                <div class="form-group">
                    <label>Data Fim</label>
                    <input type="datetime-local" id="data_fim" required>
                </div>
                <div class="form-group">
                    <label>Apreensões</label>
                    <input type="text" id="apreensoes" placeholder="Ex: 2 kg maconha, 1 pistola">
                </div>
                <div class="form-group">
                    <label>Prisões</label>
                    <input type="number" id="prisoes" min="0" value="0">
                </div>
                <div class="form-group">
                    <label>Multas</label>
                    <input type="number" id="multas" min="0" value="0">
                </div>
                <div class="form-group">
                    <label>Notas</label>
                    <textarea id="notas" style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid var(--border-color); background-color: var(--bg-darker); color: var(--text-primary); border-radius: 6px;"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Enviar Relatório</button>
            </form>
        </div>
    `;
}

// Salvar relatório
async function salvarRelatorio(event) {
    event.preventDefault();
    
    const dados = {
        data_inicio: document.getElementById('data_inicio').value,
        data_fim: document.getElementById('data_fim').value,
        apreensoes: document.getElementById('apreensoes').value,
        prisoes: parseInt(document.getElementById('prisoes').value),
        multas: parseInt(document.getElementById('multas').value),
        notas: document.getElementById('notas').value
    };
    
    try {
        const response = await fetch('/api/relatorios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        
        if (response.ok) {
            alert('Relatório enviado com sucesso!');
            irPara('meus-relatorios', {preventDefault: () => {}});
        } else {
            alert('Erro ao enviar relatório');
        }
    } catch (error) {
        alert('Erro na conexão');
    }
}

// Carregar relatórios (admin)
async function carregarRelatorios() {
    const container = document.getElementById('relatorios');
    
    try {
        const response = await fetch('/api/relatorios');
        const relatorios = await response.json();
        
        let html = '<div class="card"><div class="card-header"><h3>Todos os Relatórios</h3></div>';
        html += '<table><thead><tr><th>Agente</th><th>Data Início</th><th>Apreensões</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
        
        relatorios.forEach(rel => {
            html += `<tr>
                <td>${rel.usuario_nome}</td>
                <td>${new Date(rel.data_inicio).toLocaleDateString('pt-BR')}</td>
                <td>${rel.apreensoes || '-'}</td>
                <td><span class="badge badge-${rel.status}">${rel.status}</span></td>
                <td>
                    ${rel.status === 'pendente' ? `
                        <button class="btn btn-success" onclick="aprovarRelatorio(${rel.id})">✓ Aprovar</button>
                        <button class="btn btn-danger" onclick="reprovarRelatorio(${rel.id})">✗ Rejeitar</button>
                    ` : `<small>${rel.status}</small>`}
                </td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Erro ao carregar relatórios</p>';
    }
}

// Carregar meus relatórios (agente)
async function carregarMeusRelatorios() {
    const container = document.getElementById('meus-relatorios');
    
    try {
        const response = await fetch('/api/relatorios');
        const relatorios = await response.json();
        
        let html = '<div class="card"><div class="card-header"><h3>Meus Relatórios</h3></div>';
        html += '<table><thead><tr><th>Data Início</th><th>Apreensões</th><th>Status</th></tr></thead><tbody>';
        
        relatorios.forEach(rel => {
            html += `<tr>
                <td>${new Date(rel.data_inicio).toLocaleDateString('pt-BR')}</td>
                <td>${rel.apreensoes || '-'}</td>
                <td><span class="badge badge-${rel.status}">${rel.status}</span></td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Erro ao carregar relatórios</p>';
    }
}

// Aprovar relatório
async function aprovarRelatorio(id) {
    if (!confirm('Aprovar este relatório?')) return;
    
    try {
        const response = await fetch(`/api/relatorios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'aprovado' })
        });
        
        if (response.ok) {
            alert('Relatório aprovado!');
            carregarRelatorios();
        }
    } catch (error) {
        alert('Erro ao aprovar');
    }
}

// Reprovar relatório
async function reprovarRelatorio(id) {
    if (!confirm('Rejeitar este relatório?')) return;
    
    try {
        const response = await fetch(`/api/relatorios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'reprovado' })
        });
        
        if (response.ok) {
            alert('Relatório rejeitado!');
            carregarRelatorios();
        }
    } catch (error) {
        alert('Erro ao rejeitar');
    }
}

// Carregar ranking
async function carregarRanking() {
    const container = document.getElementById('ranking');
    
    try {
        const response = await fetch('/api/ranking');
        const ranking = await response.json();
        
        let html = '<div class="card"><div class="card-header"><h3>Ranking de Agentes</h3></div>';
        html += '<table><thead><tr><th>Posição</th><th>Agente</th><th>Cargo</th><th>Relatórios</th><th>Aprovados</th><th>Prisões</th><th>Multas</th></tr></thead><tbody>';
        
        ranking.forEach((agente, index) => {
            html += `<tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${agente.nome}</td>
                <td>${agente.cargo}</td>
                <td>${agente.total_relatorios}</td>
                <td style="color: var(--success);">${agente.relatorios_aprovados || 0}</td>
                <td>${agente.total_prisoes || 0}</td>
                <td>${agente.total_multas || 0}</td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Erro ao carregar ranking</p>';
    }
}

// Página de Regras
function pagina_regras() {
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Regras da Corporação</h3>
            </div>
            <div style="color: var(--text-secondary); line-height: 1.8;">
                <h4 style="color: var(--gold); margin-top: 15px;">1. Conduta Profissional</h4>
                <p>• Todos os agentes devem manter comportamento exemplar em qualquer situação</p>
                <p>• Respeito às hierarquias e ordens de superiores</p>
                <p>• Comunicação clara e respeitosa com colegas e públic</p>
                
                <h4 style="color: var(--gold); margin-top: 15px;">2. Uniformes</h4>
                <p>• Uso obrigatório de uniforme em todas as operações</p>
                <p>• Uniforme deve estar limpo e bem apresentável</p>
                <p>• Distintivos e insígnias devem estar visíveis</p>
                
                <h4 style="color: var(--gold); margin-top: 15px;">3. Equipamentos</h4>
                <p>• Armas devem ser mantidas com segurança</p>
                <p>• Verificação diária de equipamentos é obrigatória</p>
                <p>• Danos devem ser reportados imediatamente</p>
                
                <h4 style="color: var(--gold); margin-top: 15px;">4. Relatórios</h4>
                <p>• Todos os relatórios devem ser preenchidos com veracidade</p>
                <p>• Falsificação de dados resulta em advertência ou desligamento</p>
                <p>• Prazo máximo: 24h após a operação</p>
            </div>
        </div>
    `;
}

// Página de Viaturas
function pagina_viaturas() {
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Viaturas Disponíveis</h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div style="background-color: var(--bg-darker); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="color: var(--gold);">Chevrolet Caprice</h4>
                    <p><strong>Placa:</strong> GATE-001</p>
                    <p><strong>Status:</strong> <span style="color: var(--success);">Disponível</span></p>
                    <p><strong>Combustível:</strong> 75%</p>
                </div>
                <div style="background-color: var(--bg-darker); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="color: var(--gold);">Dodge Charger</h4>
                    <p><strong>Placa:</strong> GATE-002</p>
                    <p><strong>Status:</strong> <span style="color: var(--success);">Disponível</span></p>
                    <p><strong>Combustível:</strong> 90%</p>
                </div>
                <div style="background-color: var(--bg-darker); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                    <h4 style="color: var(--gold);">Ford Police</h4>
                    <p><strong>Placa:</strong> GATE-003</p>
                    <p><strong>Status:</strong> <span style="color: var(--warning);">Manutenção</span></p>
                    <p><strong>Combustível:</strong> 0%</p>
                </div>
            </div>
        </div>
    `;
}

// Fazer logout
async function fazerLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        usuarioLogado = null;
        mostrarLogin();
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}
