import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Xử lý preflight request (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role để vượt qua RLS
    )

    // Lấy thông tin user gửi request (từ Authorization header)
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { courseIds } = await req.json()

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Giỏ hàng trống' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Lấy giá thực tế của các course từ DB
    const { data: courses, error: coursesError } = await supabaseClient
      .from('courses')
      .select('id, price, is_free')
      .in('id', courseIds)

    if (coursesError || !courses || courses.length === 0) {
      throw new Error('Lỗi khi lấy thông tin khóa học')
    }

    let totalPrice = 0
    const orderItems = []
    const enrollments = []

    for (const course of courses) {
      const price = course.is_free ? 0 : course.price
      totalPrice += price
      
      orderItems.push({
        course_id: course.id,
        price: price
      })

      enrollments.push({
        user_id: user.id,
        course_id: course.id
      })
    }

    // Tạo Order
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert([{ user_id: user.id, total_price: totalPrice, status: 'paid' }]) // Mock payment (trực tiếp set paid)
      .select()
      .single()

    if (orderError) throw new Error('Lỗi tạo đơn hàng: ' + orderError.message)

    // Tạo Order Items
    const itemsToInsert = orderItems.map(item => ({ ...item, order_id: order.id }))
    const { error: itemsError } = await supabaseClient.from('order_items').insert(itemsToInsert)
    if (itemsError) throw new Error('Lỗi tạo chi tiết đơn hàng: ' + itemsError.message)

    // Tạo Enrollments (gán quyền truy cập khóa học)
    const { error: enrollError } = await supabaseClient.from('enrollments').insert(enrollments)
    if (enrollError) {
      // Ignored if already enrolled (handled by unique constraint)
      console.log("Enrollment warning:", enrollError.message)
    }

    return new Response(
      JSON.stringify({ success: true, order_id: order.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
