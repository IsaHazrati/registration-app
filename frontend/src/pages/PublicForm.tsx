import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PublicForm: React.FC = () => {
  const fieldLabels: { [key: string]: string } = {
    employee_code: 'کد پرسنلی',
    full_name: 'نام و نام خانوادگی',
    phone_number: 'شماره تماس',
    employment_status: 'وضعیت اشتغال',
    service_location_id: 'محل خدمت',
    items: 'محصولات'
  };

  const getValidationErrorMessage = (error: any): string => {
    const detail = error.response?.data?.detail;
    if (!detail) return 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.';
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: any) => {
          const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
          const label = fieldLabels[field] || field;
          return `${label}: ${d.msg}`;
        })
        .join(' | ');
    }
    return 'خطا در ثبت اطلاعات. لطفاً دوباره تلاش کنید.';
  };

  const [formData, setFormData] = useState({
    full_name: '',
    employee_code: '',
    phone_number: '',
    employment_status: 'شاغل',
    service_location_id: '',
    admin_description: ''
  });
  const [products, setProducts] = useState<any[]>([]);
  const [serviceLocations, setServiceLocations] = useState<any[]>([]);
  const [requestItems, setRequestItems] = useState<{ [key: number]: number }>({});
  const [deadline, setDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [showEditPrompt, setShowEditPrompt] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyName, setVerifyName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsRes = await axios.get('/api/products/public');
        setProducts(productsRes.data);

        const serviceLocationsRes = await axios.get('/api/service-locations/public');
        setServiceLocations(serviceLocationsRes.data);
        
        const deadlineRes = await axios.get('/api/settings/deadline');
        setDeadline(deadlineRes.data.edit_deadline);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    fetchData();
  }, []);

  const handleEmployeeCodeBlur = async () => {
    if (!formData.employee_code) return;
    
    try {
      const response = await axios.get(`/api/requests/${formData.employee_code}`);
      if (response.data) {
        setExistingRequest(response.data);
        setShowEditPrompt(true);
        setMessage('⚠️ این کد پرسنلی قبلاً ثبت شده است. آیا مایل به ویرایش درخواست خود هستید؟');
        setMessageType('info');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setExistingRequest(null);
        setShowEditPrompt(false);
        setMessage('');
      }
    }
  };

  const handleEditConfirm = () => {
    setShowEditPrompt(false);
    setShowVerifyForm(true);
    setMessage('لطفاً برای تأیید هویت، نام و نام خانوادگی خود را وارد کنید.');
    setMessageType('info');
  };

  const handleEditCancel = () => {
    setShowEditPrompt(false);
    setExistingRequest(null);
    setMessage('');
    setFormData({ ...formData, employee_code: '' });
  };

  const handleVerifyIdentity = async () => {
    if (!verifyName.trim()) {
      setMessage('❌ لطفاً نام و نام خانوادگی خود را وارد کنید.');
      setMessageType('error');
      return;
    }

    try {
      const response = await axios.post('/api/requests/verify', null, {
        params: {
          employee_code: formData.employee_code,
          full_name: verifyName
        }
      });
      
      if (response.data) {
        setShowVerifyForm(false);
        setIsEditing(true);
        setMessage('✅ هویت شما تأیید شد. می‌توانید درخواست خود را ویرایش کنید.');
        setMessageType('success');
        
        const existing = response.data.request;
        setFormData({
          full_name: existing.full_name,
          employee_code: existing.employee_code,
          phone_number: existing.phone_number || '',
          employment_status: existing.employment_status,
          service_location_id: existing.service_location?.id ?? existing.service_location_id ?? '',
          admin_description: existing.admin_description || ''
        });
        
        const items: { [key: number]: number } = {};
        existing.items.forEach((item: any) => {
          items[item.product_id] = item.quantity;
        });
        setRequestItems(items);
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        setMessage('❌ اطلاعات وارد شده صحیح نمی‌باشد. لطفاً مجدداً تلاش کنید.');
        setMessageType('error');
      } else {
        setMessage('❌ خطا در تأیید هویت. لطفاً دوباره تلاش کنید.');
        setMessageType('error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (formData.employee_code.trim().length < 8) {
      setMessage('❌ کد پرسنلی باید حداقل ۸ کاراکتر باشد.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (!formData.service_location_id) {
      setMessage('❌ لطفاً محل خدمت را انتخاب کنید.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    const items = products.map(p => ({
      product_id: p.id,
      quantity: parseInt(requestItems[p.id] || 0)
    }));

    const hasAnyProduct = items.some(item => item.quantity > 0);
    if (!hasAnyProduct) {
      setMessage('❌ شما هیچ محصولی انتخاب نکرده‌اید.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    const payload = {
      ...formData,
      service_location_id: parseInt(formData.service_location_id as any),
      items: items
    };

    try {
      if (isEditing) {
        await axios.put(`/api/requests/${formData.employee_code}`, payload);
        setMessage('✅ درخواست شما با موفقیت ویرایش شد!');
        setMessageType('success');
      } else {
        await axios.post('/api/requests', payload);
        setMessage('✅ درخواست شما با موفقیت ثبت شد!');
        setMessageType('success');
      }
      setSubmitted(true);
    } catch (error: any) {
      if (error.response?.status === 400) {
        setMessage('❌ این کد پرسنلی قبلاً ثبت شده است.');
        setMessageType('error');
      } else if (error.response?.status === 403) {
        setMessage('❌ امکان ویرایش این درخواست وجود ندارد (مهلت ویرایش به پایان رسیده است).');
        setMessageType('error');
      } else if (error.response?.status === 422) {
        setMessage(`❌ ${getValidationErrorMessage(error)}`);
        setMessageType('error');
      } else {
        setMessage('❌ خطا در ثبت درخواست. لطفاً دوباره تلاش کنید.');
        setMessageType('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!window.confirm('آیا از حذف درخواست خود مطمئن هستید؟')) return;
    
    try {
      await axios.delete(`/api/requests/${formData.employee_code}`);
      setMessage('✅ درخواست شما با موفقیت حذف شد.');
      setMessageType('success');
      setSubmitted(true);
      setIsEditing(false);
      setExistingRequest(null);
      setFormData({
        full_name: '',
        employee_code: '',
        phone_number: '',
        employment_status: 'شاغل',
        service_location_id: '',
        admin_description: ''
      });
      setRequestItems({});
    } catch (error: any) {
      setMessage('❌ خطا در حذف درخواست. لطفاً دوباره تلاش کنید.');
      setMessageType('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-blue-600 mb-6">
          {isEditing ? '✏️ ویرایش درخواست' : '📝 فرم ثبت درخواست'}
        </h1>
        
        {deadline && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded mb-4 text-center text-sm sm:text-base">
            ⏰ آخرین مهلت ویرایش: {new Date(deadline).toLocaleDateString('fa-IR')}
          </div>
        )}

        {message && (
          <div className={`p-3 rounded-md mb-4 text-sm sm:text-base ${
            messageType === 'success' ? 'bg-green-50 text-green-700' :
            messageType === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {formData.admin_description && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">📌 توضیحات مدیر:</span> {formData.admin_description}
            </p>
          </div>
        )}

        {!submitted || isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نام و نام خانوادگی
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  کد پرسنلی
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  disabled={isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({...formData, employee_code: e.target.value})}
                  onBlur={handleEmployeeCodeBlur}
                  placeholder="حداقل ۸ کاراکتر"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  شماره تماس
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder="مثال: 09123456789"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                وضعیت اشتغال
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="شاغل"
                    checked={formData.employment_status === 'شاغل'}
                    onChange={(e) => setFormData({...formData, employment_status: e.target.value})}
                    className="form-radio"
                  />
                  <span className="mr-2 text-sm">شاغل</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="بازنشسته"
                    checked={formData.employment_status === 'بازنشسته'}
                    onChange={(e) => setFormData({...formData, employment_status: e.target.value})}
                    className="form-radio"
                  />
                  <span className="mr-2 text-sm">بازنشسته</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                محل خدمت
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                value={formData.service_location_id}
                onChange={(e) => setFormData({...formData, service_location_id: e.target.value})}
              >
                <option value="" disabled>انتخاب کنید...</option>
                {serviceLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">محصولات</h2>
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-1 p-3 border rounded-md mb-2"
                >
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <span className="font-medium text-sm sm:text-base break-words">
                      {product.name}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      ({product.type})
                    </span>
                    <span className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                      حداکثر: {product.max_quantity}
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-xs text-gray-500 break-words line-clamp-3">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-end mt-1">
                    <label className="text-sm text-gray-600 ml-2">تعداد:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      value={requestItems[product.id] || 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/[^0-9]/g, '');
                        const val = parseInt(digitsOnly) || 0;
                        setRequestItems({
                          ...requestItems,
                          [product.id]: Math.min(val, product.max_quantity),
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading || showEditPrompt || showVerifyForm}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? 'در حال ارسال...' : isEditing ? 'ویرایش درخواست' : 'ثبت درخواست'}
              </button>
              
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDeleteRequest}
                  className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition text-sm sm:text-base"
                >
                  🗑️ حذف درخواست
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="text-center p-6">
            <p className="text-lg sm:text-xl text-gray-600">✅ درخواست شما با موفقیت ثبت شد.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700"
            >
              ثبت درخواست جدید
            </button>
          </div>
        )}

        {showEditPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">⚠️ کد پرسنلی تکراری</h3>
              <p className="mb-4 text-sm">این کد پرسنلی قبلاً ثبت شده است. آیا مایل به ویرایش درخواست خود هستید؟</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleEditConfirm}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
                >
                  بله، ویرایش
                </button>
                <button
                  onClick={handleEditCancel}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
                >
                  خیر، انصراف
                </button>
              </div>
            </div>
          </div>
        )}

        {showVerifyForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">🔐 تأیید هویت</h3>
              <p className="mb-4 text-sm">لطفاً برای تأیید هویت، نام و نام خانوادگی خود را وارد کنید.</p>
              <input
                type="text"
                placeholder="نام و نام خانوادگی"
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-sm"
                value={verifyName}
                onChange={(e) => setVerifyName(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleVerifyIdentity}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
                >
                  تأیید هویت
                </button>
                <button
                  onClick={() => {
                    setShowVerifyForm(false);
                    setShowEditPrompt(true);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
                >
                  بازگشت
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicForm;