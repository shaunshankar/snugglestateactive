CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  unit TEXT DEFAULT 'kg' CHECK (unit IN ('kg', 'lbs')),
  water_unit TEXT DEFAULT 'cups' CHECK (water_unit IN ('cups', 'ml')),
  daily_calorie_goal NUMERIC DEFAULT 2000,
  daily_water_goal NUMERIC DEFAULT 8,
  weight_target NUMERIC,
  household_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

CREATE TABLE IF NOT EXISTS weight_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  calories NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  is_manual BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS water_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  calorie_goal NUMERIC,
  water_goal NUMERIC,
  weight_target NUMERIC,
  goals_met BOOLEAN DEFAULT FALSE,
  streak_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS monthly_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  weight_loss_target NUMERIC NOT NULL,
  reward_amount NUMERIC,
  starting_weight NUMERIC,
  achieved BOOLEAN DEFAULT FALSE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id),
  type TEXT DEFAULT 'cheer',
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
