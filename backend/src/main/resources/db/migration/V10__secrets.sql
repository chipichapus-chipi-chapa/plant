-- Секретки: тайники без мерцания и со своей надписью на кнопке («Подвести стрелки», «Покачаться»…)
ALTER TABLE discovery_spot ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE discovery_spot ADD COLUMN action_label VARCHAR(40) NOT NULL DEFAULT 'Осмотреть';
