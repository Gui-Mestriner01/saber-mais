import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../CSS/Cadastro.css';

export default function CadastroAluno() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ nome: '', email: '', login: '', senha: '' });
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro(''); setSucesso(''); setLoading(true);
        try {
        const res = await fetch('http://localhost:3001/cadastro/aluno', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro);
        setSucesso(data.mensagem);
        setForm({ nome: '', email: '', login: '', senha: '' });
        } catch (err) {
        setErro(err.message);
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="cadastro-container">
        <div className="floating-items">
            <span style={{ top: '6%',  left: '8%',   fontSize: 36 }}>🎒</span>
            <span style={{ top: '12%', right: '10%', fontSize: 30 }}>✏️</span>
            <span style={{ bottom: '18%', left: '6%', fontSize: 34 }}>📚</span>
            <span style={{ bottom: '10%', right: '8%', fontSize: 28 }}>⭐</span>
            <span style={{ top: '42%', left: '3%',  fontSize: 26 }}>🔭</span>
            <span style={{ top: '32%', right: '4%', fontSize: 24 }}>🧪</span>
        </div>

        <div className="cadastro-content">
            <div className="brand">
            <span className="brand-saber">Saber</span>
            <span className="brand-plus">+</span>
            </div>

            <div className="cadastro-card">
            <div className="cadastro-avatar">🧑‍💻</div>
            <h2>CADASTRO DO ALUNO</h2>
            <p className="subtitulo">Crie sua conta para começar a aprender!</p>

            {erro && <p className="msg-erro">{erro}</p>}
            {sucesso && <p className="msg-sucesso">{sucesso}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span className="campo-label">Nome Completo</span>
                <div className="input-group">
                <span className="input-icon">👤</span>
                <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Seu nome completo" />
                </div>

                <span className="campo-label">E-mail</span>
                <div className="input-group">
                <span className="input-icon">@</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="seu@email.com" />
                </div>

                <span className="campo-label">Login</span>
                <div className="input-group">
                <span className="input-icon">🪪</span>
                <input name="login" value={form.login} onChange={handleChange} required placeholder="Escolha um login" />
                </div>

                <span className="campo-label">Senha</span>
                <div className="input-group">
                <span className="input-icon">🔒</span>
                <input name="senha" type="password" value={form.senha} onChange={handleChange} required placeholder="Crie uma senha" />
                </div>

                <button type="submit" className="btn-cadastrar-aluno" disabled={loading}>
                {loading ? 'Cadastrando...' : 'CRIAR CONTA →'}
                </button>
            </form>

            <hr className="divisor" />

            <p className="cadastro-link">
                Já tem conta? <span onClick={() => navigate('/login/aluno')}>Fazer login &gt;</span>
            </p>
            </div>

            <button className="back-btn" onClick={() => navigate('/')}>← Voltar</button>
        </div>
        </div>
    );
}