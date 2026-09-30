// Login via Firebase Authentication: Google (login social) e e-mail/senha.
// O Firebase guarda as contas; a plataforma não guarda nada dos usuários nem das calculadoras.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const cfg = APP_CONFIG.FIREBASE || {};
const configurado = !!(cfg.apiKey && cfg.projectId);
const auth = configurado ? getAuth(initializeApp(cfg)) : null;

const ERROS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/email-already-in-use': 'Esse e-mail já tem conta. Use "Entrar".',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  'auth/popup-closed-by-user': 'Login cancelado.',
  'auth/cancelled-popup-request': 'Login cancelado.',
  'auth/popup-blocked': 'O navegador bloqueou a janela de login. Libere pop-ups para este site.',
  'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase (Authentication > Configurações > Domínios autorizados).',
  'auth/operation-not-allowed': 'Este método de login ainda não foi ativado no Firebase.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
};
const traduz = e => { throw new Error(ERROS[e.code] || 'Não foi possível concluir. Tente novamente.'); };

window.Auth = {
  configurado,
  // cb(usuario|null) é chamado ao carregar e a cada login/logout.
  iniciar(cb) {
    if (!auth) return cb(null);
    onAuthStateChanged(auth, u => cb(u ? { nome: u.displayName || u.email, email: u.email } : null));
  },
  google: () => signInWithPopup(auth, new GoogleAuthProvider()).catch(traduz),
  entrar: (email, senha) => signInWithEmailAndPassword(auth, email.trim(), senha).catch(traduz),
  cadastrar: (email, senha) => createUserWithEmailAndPassword(auth, email.trim(), senha).catch(traduz),
  recuperar: email => sendPasswordResetEmail(auth, email.trim()).catch(traduz),
  sair: () => signOut(auth),
};
