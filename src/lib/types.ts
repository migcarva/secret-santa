export interface Player {
  id: number;
  name: string;
  pin: string;
  secret_player_id: number | null;
  created_at: string;
}

export interface PlayerWithSecret extends Player {
  secret_player_name: string | null;
}

export interface PlayerWithIncompatibilities extends Player {
  incompatible_ids: number[];
}

export interface Incompatibility {
  player_id: number;
  incompatible_with_id: number;
}

export interface AdminPlayerView {
  id: number;
  name: string;
  pin: string;
  has_assignment: boolean;
  secret_player_name: string | null;
  incompatible_ids: number[];
  incompatible_names: string[];
}
