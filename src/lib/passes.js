import supabase from '../supabase'

export async function getPassesForClient(clientId) {
  const { data, error } = await supabase
    .from('passes')
    .select('id, remaining, products(id, name)')
    .eq('client_id', clientId)
    .order('created_at')
  if (error) throw error
  return data.map(p => ({ ...p, product_name: p.products.name, product_id: p.products.id }))
}

export async function getPassesByCode(code) {
  const { data, error } = await supabase
    .from('clients')
    .select('passes(remaining, products(name))')
    .eq('code', code)
    .single()
  if (error) throw error
  return data.passes.map(p => ({ product_name: p.products.name, remaining: p.remaining }))
}

export async function upsertPass(clientId, productId, remaining) {
  const { error } = await supabase
    .from('passes')
    .upsert(
      { client_id: clientId, product_id: productId, remaining },
      { onConflict: 'client_id,product_id' }
    )
  if (error) throw error
}

export async function removePass(clientId, productId) {
  const { error } = await supabase
    .from('passes')
    .delete()
    .eq('client_id', clientId)
    .eq('product_id', productId)
  if (error) throw error
}
