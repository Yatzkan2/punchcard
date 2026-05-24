import supabase from '../supabase'

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function addProduct(name) {
  const { data, error } = await supabase
    .from('products')
    .insert({ name })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error(`${name} already exists.`)
    throw error
  }
  return data
}

export async function removeProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  if (error) throw error
}
