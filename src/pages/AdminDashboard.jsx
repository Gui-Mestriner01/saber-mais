import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Admin.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [professores, setProfessores] = useState([]);
  const [carregando, setCarregando]   = useState(true);
  const [filtro, setFiltro]           = useState('pendente');

  useEffect(() => {
    buscarProfessores();
  }, [filtro]);

  const buscarProfessores = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`http://localhost:3001/admin/professores?status=${filtro}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setProfessores(data);
    } catch {
      console.error('Erro ao buscar professores');
    } finally {
      setCarregando(false);
    }
  };

  const handleAcao = async (id, acao) => {
    try {
      await fetch(`http://localhost:3001/admin/professor/${id}/${acao}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      buscarProfessores();
    } catch {
      console.error('Erro ao atualizar status');
    }
  };

  const handleSair = () => {
    localStorage.clear();
    navigate('/');
  };

  const statusLabel = { pendente: '⏳ Pendentes', aprovado: '✅ Aprovados', rejeitado: '❌ Rejeitados' };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-saber">Saber</span><span className="brand-plus">+</span>
        </div>
        <p className="admin-label">Painel Admin</p>

        <nav className="admin-nav">
          {['pendente', 'aprovado', 'rejeitado'].map(s => (
            <button
              key={s}
              className={`admin-nav-btn ${filtro === s ? 'ativo' : ''}`}
              onClick={() => setFiltro(s)}
            >
              {statusLabel[s]}
            </button>
          ))}
        </nav>

        <button className="admin-sair" onClick={handleSair}>← Sair</button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>{statusLabel[filtro]}</h1>
          <span className="admin-total">{professores.length} professor(es)</span>
        </header>

        {carregando ? (
          <div className="admin-loading">Carregando...</div>
        ) : professores.length === 0 ? (
          <div className="admin-vazio">
            <span>📭</span>
            <p>Nenhum professor {filtro} encontrado.</p>
          </div>
        ) : (
          <div className="admin-lista">
            {professores.map(prof => (
              <div key={prof.id} className="admin-card">
                <div className="admin-card-info">
                  <div className="admin-avatar">👨‍🏫</div>
                  <div>
                    <h3>{prof.nome}</h3>
                    <p>{prof.email}</p>
                    <span className={`admin-status ${prof.status}`}>{prof.status}</span>
                  </div>
                </div>

                <div className="admin-card-acoes">
                  {prof.status === 'pendente' && (
                    <>
                      <button className="btn-aprovar" onClick={() => handleAcao(prof.id, 'aprovar')}>
                        ✅ Aprovar
                      </button>
                      <button className="btn-rejeitar" onClick={() => handleAcao(prof.id, 'rejeitar')}>
                        ❌ Rejeitar
                      </button>
                    </>
                  )}
                  {prof.status === 'aprovado' && (
                    <button className="btn-rejeitar" onClick={() => handleAcao(prof.id, 'rejeitar')}>
                      ❌ Revogar acesso
                    </button>
                  )}
                  {prof.status === 'rejeitado' && (
                    <button className="btn-aprovar" onClick={() => handleAcao(prof.id, 'aprovar')}>
                      ✅ Aprovar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;