import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Xác thực người gọi có phải admin không
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Forbidden: Only admin can perform this action')
    }

    // XỬ LÝ THEO METHOD
    if (req.method === 'POST') {
      // TẠO USER MỚI
      const { email, password, name, role } = await req.json()
      
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      })

      if (createError) throw createError

      // Update role (vì trigger tự tạo profile với role = student)
      if (role && role !== 'student') {
        const { error: updateRoleError } = await supabaseClient
          .from('profiles')
          .update({ role })
          .eq('id', newUser.user.id)
          
        if (updateRoleError) console.error("Error updating role:", updateRoleError)
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } 
    else if (req.method === 'DELETE') {
      // XÓA USER
      const { id } = await req.json()
      if (!id) throw new Error("Missing user id")

      // Không cho tự xóa chính mình
      if (id === user.id) throw new Error("Cannot delete yourself")

      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(id)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error('Method not allowed')

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
