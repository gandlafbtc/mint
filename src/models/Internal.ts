export class MintPreferences {
  name?: string;
  pubkey?: string;
  version?: string;
  description?: string;
  contact?: {
    method?: string;
    info?: string;
  }[];
  motd?: string;
  icon_url?: string;
  mintOptions?: {
    methods?: {
      method?: string;
      unit?: string;
      description?: boolean;
    }[];
    disabled?: boolean;
  };
  meltOptions?: {
    methods?: {
      method?: string;
      unit?: string;
    }[];
    disabled?: boolean;
  };
};

