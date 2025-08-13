const express = require('express');
const router = express.Router();
const {
  getCommunications,
  getCommunicationById,
  createCommunication,
  updateCommunication,
  deleteCommunication,
  getCommunicationsByCondominium,
  toggleLikeCommunication,
  getCommunicationStats
} = require('../controllers/communicationController');

const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');
const { validateCommunication, validateCommunicationUpdate } = require('../middleware/validation');

// Todas as rotas requerem autenticação
router.use(protect);

// Rotas públicas (todos os usuários autenticados)
router.get('/', getCommunications);
router.get('/:id', getCommunicationById);
router.get('/condominium/:condominiumId', getCommunicationsByCondominium);
router.post('/:id/like', toggleLikeCommunication);

// Rotas para criar comunicações (admin, manager, syndic)
router.post('/', 
  requireRole('admin', 'manager', 'syndic'),
  validateCommunication,
  createCommunication
);

// Rotas para atualizar comunicações (admin, manager, syndic ou autor)
router.put('/:id',
  validateCommunicationUpdate,
  updateCommunication
);

// Rotas para deletar comunicações (admin ou autor)
router.delete('/:id', deleteCommunication);

// Rotas de estatísticas (admin, manager, syndic)
router.get('/stats/:condominiumId',
  requireRole('admin', 'manager', 'syndic'),
  getCommunicationStats
);

module.exports = router;