// Roteamento por hash (#/rota). Funciona em qualquer hospedagem estática.

export const go = (hash) => {
  if (location.hash === hash) rerender();
  else location.hash = hash;
};

export const rerender = () => window.dispatchEvent(new Event('rerender'));
