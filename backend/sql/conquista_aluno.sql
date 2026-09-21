-- ============================================================================
-- Saber+ — tabela das insígnias conquistadas
--
-- O servidor cria esta tabela sozinho quando sobe (server.js, seção 10b).
-- O arquivo existe para documentar o banco e para quem quiser criar à mão.
--
-- Por que a insígnia é "por turma": aluno_id aponta para aluno_sala.id, e cada
-- turma tem a própria linha em aluno_sala. O mesmo aluno em duas turmas tem
-- dois ids, então as conquistas de uma turma não aparecem na outra.
-- ============================================================================

CREATE TABLE IF NOT EXISTS conquista_aluno (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id       INT          NOT NULL,   -- aluno_sala.id (o aluno naquela turma)
  sala_id        INT          NOT NULL,   -- sala.id (facilita contar por turma)
  codigo         VARCHAR(40)  NOT NULL,   -- qual insígnia (ver CONQUISTAS no server.js)
  conquistada_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vista          TINYINT(1)   NOT NULL DEFAULT 0,  -- o aluno já viu a comemoração?

  -- Cada aluno ganha cada insígnia uma vez só
  UNIQUE KEY uk_aluno_codigo (aluno_id, codigo),
  KEY idx_sala (sala_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- Conquistas do professor. Valem para a conta inteira (todas as turmas).
-- Também criada sozinha pelo servidor (server.js, seção 10c).
-- ============================================================================

CREATE TABLE IF NOT EXISTS conquista_professor (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  professor_id   INT          NOT NULL,   -- usuario.id do professor
  codigo         VARCHAR(40)  NOT NULL,   -- qual insígnia (ver CONQUISTAS_PROFESSOR)
  conquistada_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vista          TINYINT(1)   NOT NULL DEFAULT 0,

  UNIQUE KEY uk_professor_codigo (professor_id, codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
