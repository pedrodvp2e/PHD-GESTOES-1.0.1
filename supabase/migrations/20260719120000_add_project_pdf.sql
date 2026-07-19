/*
  # Adiciona suporte a importação de projeto em PDF por obra

  1. Alterações
    - Adiciona a coluna `project_pdf` na tabela `projects`, usada para
      armazenar o arquivo PDF do projeto (em base64) vinculado à obra.
*/

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_pdf text;
