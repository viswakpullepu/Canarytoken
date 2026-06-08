import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        id, attacker_ip, user_agent, triggered_at,
        tokens (token_name, memo)
      `)
      .order('triggered_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    
    const formattedData = data.map((alert: any) => ({
      id: alert.id,
      attacker_ip: alert.attacker_ip,
      user_agent: alert.user_agent,
      triggered_at: alert.triggered_at,
      token_name: alert.tokens?.token_name,
      memo: alert.tokens?.memo,
    }));

    return NextResponse.json(formattedData);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token_name, memo } = body;

    const { data, error } = await supabase
      .from('tokens')
      .insert([{ token_name, memo }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
