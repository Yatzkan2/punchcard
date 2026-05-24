import supabase from '../supabase'

export async function getClientByCode(code) {
  const { data, error } = await supabase
    .from('clients')
    .select('*, passes(remaining, products(name))')
    .eq('code', code)
    .single()
  if (error) throw error
  return {
    ...data,
    passes: (data.passes ?? []).map(p => ({ product_name: p.products.name, remaining: p.remaining })),
  }
}

export async function getAllClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, entries, code, created_at, passes(id, remaining, products(id, name))')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(c => ({
    ...c,
    passes: (c.passes ?? []).map(p => ({
      id: p.id,
      remaining: p.remaining,
      product_id: p.products.id,
      product_name: p.products.name,
    })),
  }))
}

export async function addClient(name, code) {
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, code })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error(`${name} is already a client.`)
    throw error
  }
  return data
}

export async function punchClient(id, passes, entries) {
  const next = Math.max(passes - 1, 0)
  const { error } = await supabase
    .from('clients')
    .update({ passes: next, entries: entries + 1 })
    .eq('id', id)
  if (error) {
    // entries column not yet added — fall back to passes-only update
    if (error.code === '42703' || error.message?.includes('entries')) {
      const { error: e2 } = await supabase
        .from('clients')
        .update({ passes: next })
        .eq('id', id)
      if (e2) throw e2
      return
    }
    throw error
  }
}

export async function updatePasses(id, passes) {
  const { data, error } = await supabase
    .from('clients')
    .update({ passes })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function incrementEntries(id, entries) {
  const { error } = await supabase
    .from('clients')
    .update({ entries: entries + 1 })
    .eq('id', id)
  if (error) throw error
}

export async function removeClient(id) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}
