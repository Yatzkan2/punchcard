import supabase from '../supabase'

export async function getSlotsByWeek(startDate) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  const { data, error } = await supabase
    .from('slots')
    .select('*, products!slots_product_id_fkey(id, name), slot_registrations(id, attended, clients(id, name))')
    .gte('starts_at', start.toISOString())
    .lt('starts_at', end.toISOString())
    .order('starts_at')
  if (error) throw error
  return data
}

export async function createSlot(date, time, productId, capacity, notes) {
  const starts_at = new Date(`${date}T${time}`).toISOString()
  const { data, error } = await supabase
    .from('slots')
    .insert({ starts_at, product_id: productId || null, capacity, notes: notes || null })
    .select('*, products!slots_product_id_fkey(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function updateSlot(id, fields) {
  const { data, error } = await supabase
    .from('slots')
    .update(fields)
    .eq('id', id)
    .select('*, products!slots_product_id_fkey(id, name)')
    .single()
  if (error) throw error
  return data
}

export async function deleteSlot(id) {
  const { error } = await supabase
    .from('slots')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function getSlotCountForProduct(productId) {
  const { count, error } = await supabase
    .from('slots')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
  if (error) throw error
  return count ?? 0
}

export async function getSlotWithRegistrations(id) {
  const { data, error } = await supabase
    .from('slots')
    .select('*, products!slots_product_id_fkey(id, name), slot_registrations(id, attended, clients(id, name))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
