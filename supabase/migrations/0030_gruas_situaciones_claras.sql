-- Situaciones de Grúas con nombres más claros (los de "subsuelo" y "techo bajo"
-- no se entendían).
update gruas.situaciones set nombre = 'En un estacionamiento subterráneo' where id = 'subsuelo';
update gruas.situaciones set nombre = 'Lugar cerrado o con techo bajo (la grúa no entra)' where id = 'techo_bajo';
