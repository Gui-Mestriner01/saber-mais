import { useState, useEffect } from 'react';

function BotaoLeitura({ texto }) {
  const [lendo, setLendo] = useState(false);
  const [vozes, setVozes] = useState([]);

  // Carrega a lista de vozes assim que o botão aparece na tela
  useEffect(() => {
    const atualizarVozes = () => setVozes(window.speechSynthesis.getVoices());
    atualizarVozes();
    
    // O navegador às vezes demora um segundo para carregar as vozes, isso garante que pegamos!
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = atualizarVozes;
    }
    
    // Se o aluno sair da tela, a voz para de falar automaticamente
    return () => window.speechSynthesis.cancel();
  }, []);

  const lerTexto = () => {
    if (!('speechSynthesis' in window)) {
      alert("Desculpe, seu navegador não suporta leitura de voz.");
      return;
    }

    if (lendo) {
      window.speechSynthesis.cancel();
      setLendo(false);
      return;
    }

    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR';
    
    // TENTATIVA DE DEIXAR A VOZ MAIS LEGAL:
    // Procura vozes mais humanizadas (Google, Francisca, Luciana, etc.)
    const vozPreferida = vozes.find(v => 
      v.lang.includes('pt-BR') && 
      (v.name.includes('Google') || v.name.includes('Francisca') || v.name.includes('Luciana'))
    );
    
    // Se achar uma voz boa, usa ela. Se não, usa a padrão.
    if (vozPreferida) {
      mensagem.voice = vozPreferida;
    }

    mensagem.rate = 0.85; // Velocidade um pouquinho reduzida (ajuda na compreensão)
    mensagem.pitch = 1.3; // Tom de voz mais agudo (fica menos robótico e mais "animado")

    mensagem.onend = () => setLendo(false);
    mensagem.onerror = () => setLendo(false);

    setLendo(true);
    window.speechSynthesis.speak(mensagem);
  };

  return (
    <button
      onClick={lerTexto}
      title={lendo ? "Parar leitura" : "Ouvir pergunta"}
      style={{
        backgroundColor: lendo ? '#f87171' : '#3b82f6', // Vermelho quando lendo, Azul quando parado
        color: 'white',
        border: 'none',
        borderRadius: '24px',
        padding: '10px 20px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        transform: lendo ? 'scale(1.05)' : 'scale(1)',
        fontFamily: 'inherit'
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{lendo ? '⏹️' : '🔊'}</span>
      {lendo ? 'Parar' : 'Ouvir a pergunta'}
    </button>
  );
}

export default BotaoLeitura;