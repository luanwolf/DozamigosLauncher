interface ImportMetaEnv {
  readonly VITE_FORTNITE_API_KEY?: string;
  readonly VITE_FNBR_API_KEY?: string;
  readonly VITE_API_FORTNITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
