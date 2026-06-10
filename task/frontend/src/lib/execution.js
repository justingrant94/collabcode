const EXECUTION_ENV = import.meta.env.VITE_ENABLE_EXECUTE;

export const EXECUTION_ENABLED =
  EXECUTION_ENV === 'true' || (EXECUTION_ENV !== 'false' && import.meta.env.DEV);

export const EXECUTION_DISABLED_MESSAGE =
  'Code execution is disabled in the hosted portfolio build. Clone the repo or run locally to try the sandbox.';