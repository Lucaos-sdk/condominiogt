/**
 * Utilitários de validação para CPF, CNPJ, telefone, etc.
 */

/**
 * Valida CPF
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean}
 */
function isValidCPF(cpf) {
  if (!cpf) return true; // Opcional
  
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cpf.charAt(9)) !== digit1) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cpf.charAt(10)) === digit2;
}

/**
 * Valida CNPJ
 * @param {string} cnpj - CNPJ a ser validado
 * @returns {boolean}
 */
function isValidCNPJ(cnpj) {
  if (!cnpj) return true; // Opcional
  
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cnpj.charAt(12)) !== digit1) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cnpj.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cnpj.charAt(13)) === digit2;
}

/**
 * Valida telefone brasileiro
 * @param {string} phone - Telefone a ser validado
 * @returns {boolean}
 */
function isValidBrazilianPhone(phone) {
  if (!phone) return true; // Opcional
  
  // Remove caracteres não numéricos
  phone = phone.replace(/\D/g, '');
  
  // Verifica se tem 10 ou 11 dígitos (com DDD)
  if (phone.length < 10 || phone.length > 11) return false;
  
  // Verifica se o DDD é válido (11-99)
  const ddd = parseInt(phone.substring(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  
  // Para celular (11 dígitos), o primeiro dígito após o DDD deve ser 9
  if (phone.length === 11 && phone.charAt(2) !== '9') return false;
  
  return true;
}

/**
 * Valida CEP brasileiro
 * @param {string} cep - CEP a ser validado
 * @returns {boolean}
 */
function isValidCEP(cep) {
  if (!cep) return false; // Obrigatório
  
  // Remove caracteres não numéricos
  cep = cep.replace(/\D/g, '');
  
  // Verifica se tem 8 dígitos
  return cep.length === 8;
}

/**
 * Valida email
 * @param {string} email - Email a ser validado
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email) return true; // Opcional
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normaliza CPF (remove formatação)
 * @param {string} cpf - CPF a ser normalizado
 * @returns {string}
 */
function normalizeCPF(cpf) {
  if (!cpf) return cpf;
  return cpf.replace(/\D/g, '');
}

/**
 * Normaliza CNPJ (remove formatação)
 * @param {string} cnpj - CNPJ a ser normalizado
 * @returns {string}
 */
function normalizeCNPJ(cnpj) {
  if (!cnpj) return cnpj;
  return cnpj.replace(/\D/g, '');
}

/**
 * Normaliza telefone (remove formatação)
 * @param {string} phone - Telefone a ser normalizado
 * @returns {string}
 */
function normalizePhone(phone) {
  if (!phone) return phone;
  return phone.replace(/\D/g, '');
}

/**
 * Normaliza CEP (remove formatação)
 * @param {string} cep - CEP a ser normalizado
 * @returns {string}
 */
function normalizeCEP(cep) {
  if (!cep) return cep;
  return cep.replace(/\D/g, '');
}

module.exports = {
  isValidCPF,
  isValidCNPJ,
  isValidBrazilianPhone,
  isValidCEP,
  isValidEmail,
  normalizeCPF,
  normalizeCNPJ,
  normalizePhone,
  normalizeCEP
};