import supabase from '../supabase'

export async function getClientByCode(code) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('code', code)
    .single()
  if (error) throw error
  return data
}

export async function getAllClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addClient(name, passes, code) {
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, passes, code })
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

export async function removeClient(id) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}
