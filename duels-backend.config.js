window.DUELS_BACKEND_CONFIG = Object.assign({
  provider: 'supabase',
  enabled: true,
  projectName: 'SP Cup Duels',
  supabaseUrl: 'https://qvigsvrxahuopeuefizy.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aWdzdnJ4YWh1b3BldWVmaXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MTg1NjgsImV4cCI6MjA5MDk5NDU2OH0.lpXZlYqxp_JiytXAoNncBQymn80DnoLMWWfVEgZ-tDs',
  authStorageKey: 'sp-cup-duels-remote-session-v1',
  tables: {
    profiles: 'profiles',
    duels: 'duels',
    duelEntries: 'duel_entries',
    miniFantasyEntries: 'mini_fantasy_entries',
    miniFantasyDailyBonuses: 'mini_fantasy_daily_bonus_claims',
    miniFantasyLeaderboardRows: 'mini_fantasy_leaderboard_rows'
  }
}, window.DUELS_BACKEND_CONFIG || {});
