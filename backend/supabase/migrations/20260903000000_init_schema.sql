-- Migration: 20260903000000_init_schema.sql
-- Description: MVP schema setup with Row Level Security (RLS) for profiles, datasets, analyses, forecast_steps, explanations, and storage.objects

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Datasets Table (File metadata for uploaded analysis datasets)
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    row_count INTEGER,
    column_names TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Analyses Table (Analysis job execution metadata and status)
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    horizon INTEGER NOT NULL DEFAULT 5,
    target_column TEXT,
    config JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ
);

-- 4. Forecast Steps Table (Time-series forecast results)
CREATE TABLE IF NOT EXISTS public.forecast_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
    step_number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ,
    forecast_value DOUBLE PRECISION NOT NULL,
    lower_bound DOUBLE PRECISION,
    upper_bound DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Explanations Table (Feature importance and AI summaries)
CREATE TABLE IF NOT EXISTS public.explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
    summary TEXT NOT NULL,
    feature_importance JSONB DEFAULT '{}'::jsonb NOT NULL,
    insights JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Sensible Indexes
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_dataset_id ON public.analyses(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_forecast_steps_analysis_id ON public.forecast_steps(analysis_id);
CREATE INDEX IF NOT EXISTS idx_explanations_analysis_id ON public.explanations(analysis_id);

-- Storage Bucket Initialization for Analysis Datasets
INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;

-- Database Row Level Security (RLS) Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own datasets" ON public.datasets;
CREATE POLICY "Users can view own datasets" ON public.datasets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own datasets" ON public.datasets;
CREATE POLICY "Users can insert own datasets" ON public.datasets FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own datasets" ON public.datasets;
CREATE POLICY "Users can update own datasets" ON public.datasets FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own datasets" ON public.datasets;
CREATE POLICY "Users can delete own datasets" ON public.datasets FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;
CREATE POLICY "Users can view own analyses" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own analyses" ON public.analyses;
CREATE POLICY "Users can insert own analyses" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view forecast steps" ON public.forecast_steps;
CREATE POLICY "Users can view forecast steps" ON public.forecast_steps FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analyses WHERE public.analyses.id = forecast_steps.analysis_id AND public.analyses.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view explanations" ON public.explanations;
CREATE POLICY "Users can view explanations" ON public.explanations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.analyses WHERE public.analyses.id = explanations.analysis_id AND public.analyses.user_id = auth.uid())
);

-- Storage Objects Policies for 'datasets' bucket
DROP POLICY IF EXISTS "Dataset Storage Insert Policy" ON storage.objects;
CREATE POLICY "Dataset Storage Insert Policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'datasets');

DROP POLICY IF EXISTS "Dataset Storage Select Policy" ON storage.objects;
CREATE POLICY "Dataset Storage Select Policy" ON storage.objects FOR SELECT USING (bucket_id = 'datasets');

DROP POLICY IF EXISTS "Dataset Storage Update Policy" ON storage.objects;
CREATE POLICY "Dataset Storage Update Policy" ON storage.objects FOR UPDATE USING (bucket_id = 'datasets');

DROP POLICY IF EXISTS "Dataset Storage Delete Policy" ON storage.objects;
CREATE POLICY "Dataset Storage Delete Policy" ON storage.objects FOR DELETE USING (bucket_id = 'datasets');
