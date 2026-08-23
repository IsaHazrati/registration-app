import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', type: '', max_quantity: 1, description: '' });
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ name: '', type: '', max_quantity: 1, description: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('admin_token');

  const fetchData = async () => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [productsRes, requestsRes, deadlineRes] = await Promise.all([
        axios.get('/api/products/public'),
        axios.get('/api/admin/requests', { headers }),
        axios.get('/api/settings/deadline')
      ]);
      
      setProducts(productsRes.data);
      setRequests(requestsRes.data);
      setDeadline(deadlineRes.data.edit_deadline || '');
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/products', newProduct, { headers });
      setNewProduct({ name: '', type: '', max_quantity: 1, description: '' });
      setMessage('✅ محصول با موفقیت اضافه شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در افزودن محصول');
      console.error(error);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      type: product.type,
      max_quantity: product.max_quantity,
      description: product.description || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/products/${editingProduct.id}`, editFormData, { headers });
      setMessage('✅ محصول با موفقیت ویرایش شد');
      setShowEditModal(false);
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در ویرایش محصول');
      console.error(error);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('آیا از حذف این محصول مطمئن هستید؟')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/products/${id}`, { headers });
      setMessage('✅ محصول با موفقیت حذف شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در حذف محصول');
      console.error(error);
    }
  };

  const handleToggleEdit = async (requestId: number, currentStatus: boolean) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/requests/${requestId}/toggle-edit?is_editable=${!currentStatus}`, {}, { headers });
      setMessage('✅ وضعیت ویرایش به‌روزرسانی شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در به‌روزرسانی وضعیت');
      console.error(error);
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!window.confirm('آیا از حذف این درخواست مطمئن هستید؟')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/requests/${id}`, { headers });
      setMessage('✅ درخواست با موفقیت حذف شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در حذف درخواست');
      console.error(error);
    }
  };

  const handleUpdateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put('/api/settings/deadline', { edit_deadline: deadline }, { headers });
      setMessage('✅ تاریخ ویرایش با موفقیت به‌روزرسانی شد');
      fetchData();
    } catch (error: any) {
      setMessage('❌ خطا در به‌روزرسانی تاریخ');
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setDescriptionText(request.admin_description || '');
    setEditingDescription(false);
    setShowDetailModal(true);
  };

  const handleSaveDescription = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `/api/admin/requests/${selectedRequest.id}/description?description=${encodeURIComponent(descriptionText)}`,
        {},
        { headers }
      );
      setMessage('✅ توضیحات با موفقیت به‌روزرسانی شد');
      setEditingDescription(false);
      fetchData();
      setSelectedRequest({ ...selectedRequest, admin_description: descriptionText });
    } catch (error: any) {
      setMessage('❌ خطا در به‌روزرسانی توضیحات');
      console.error(error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/admin/requests/export/csv', {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'requests.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('✅ خروجی CSV با موفقیت دانلود شد');
    } catch (error: any) {
      setMessage('❌ خطا در دانلود CSV');
      console.error(error);
    }
  };

  const handleExportExcel = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get('/api/admin/requests/export/excel', {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'requests.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMessage('✅ خروجی Excel با موفقیت دانلود شد');
    } catch (error: any) {
      setMessage('❌ خطا در دانلود Excel');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">پنل مدیریت</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm sm:text-base"
            >
              📥 CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-sm sm:text-base"
            >
              📊 Excel
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 text-sm sm:text-base"
            >
              خروج
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-md mb-4 text-sm sm:text-base ${
            message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* مدیریت محصولات */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">مدیریت محصولات</h2>
          
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              placeholder="نام محصول"
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            />
            <input
              type="text"
              placeholder="نوع محصول"
              required
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.type}
              onChange={(e) => setNewProduct({...newProduct, type: e.target.value})}
            />
            <input
              type="number"
              placeholder="حداکثر تعداد"
              required
              min="1"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.max_quantity}
              onChange={(e) => setNewProduct({...newProduct, max_quantity: parseInt(e.target.value) || 1})}
            />
            <input
              type="text"
              placeholder="توضیحات (اختیاری)"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
            />
            <button type="submit" className="bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 col-span-full sm:col-span-1 text-sm sm:text-base">
              افزودن محصول
            </button>
          </form>

          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden shadow sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نوع</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">حداکثر تعداد</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">توضیحات</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="px-3 py-2 text-sm break-words max-w-[100px] sm:max-w-[150px]">
                          {product.name}
                        </td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {product.type}
                        </td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {product.max_quantity}
                        </td>
                        <td className="px-3 py-2 text-sm break-words max-w-[80px] sm:max-w-[120px] truncate">
                          {product.description || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-xs sm:text-sm ml-1"
                          >
                            ویرایش
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-xs sm:text-sm"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* مدیریت درخواست‌ها */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">مدیریت درخواست‌ها</h2>
          
          <div className="overflow-x-auto -mx-4 sm:-mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden shadow sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">کد پرسنلی</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نام</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">وضعیت</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">تاریخ ثبت</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">قابل ویرایش</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {requests.map((req) => (
                      <tr key={req.id}>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{req.employee_code}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{req.full_name}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{req.employment_status}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">{new Date(req.submitted_at).toLocaleDateString('fa-IR')}</td>
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          {req.is_editable ? '✅ فعال' : '❌ غیرفعال'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            onClick={() => handleViewDetails(req)}
                            className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 text-xs sm:text-sm ml-1"
                          >
                            جزئیات
                          </button>
                          <button
                            onClick={() => handleToggleEdit(req.id, req.is_editable)}
                            className={`px-2 py-1 rounded-md text-xs sm:text-sm mr-1 ${
                              req.is_editable 
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            {req.is_editable ? 'غیرفعال' : 'فعال'}
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 text-xs sm:text-sm"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* تنظیمات تاریخ ویرایش */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">تنظیمات تاریخ ویرایش</h2>
          <form onSubmit={handleUpdateDeadline} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                تاریخ و زمان آخرین فرصت ویرایش
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={deadline || ''}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto">
              ذخیره
            </button>
          </form>
        </div>
      </div>

      {/* مودال ویرایش محصول */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">ویرایش محصول</h3>
            <form onSubmit={handleUpdateProduct}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">نام محصول</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع محصول</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({...editFormData, type: e.target.value})}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">حداکثر تعداد</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={editFormData.max_quantity}
                  onChange={(e) => setEditFormData({...editFormData, max_quantity: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base"
                >
                  ذخیره تغییرات
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال جزئیات درخواست */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">جزئیات درخواست</h3>
            <div className="mb-4 text-sm sm:text-base">
              <p><strong>کد پرسنلی:</strong> {selectedRequest.employee_code}</p>
              <p><strong>نام و نام خانوادگی:</strong> {selectedRequest.full_name}</p>
              <p><strong>شماره تماس:</strong> {selectedRequest.phone_number || '-'}</p>
              <p><strong>وضعیت اشتغال:</strong> {selectedRequest.employment_status}</p>
              <p><strong>تاریخ ثبت:</strong> {new Date(selectedRequest.submitted_at).toLocaleString('fa-IR')}</p>
              <p><strong>وضعیت ویرایش:</strong> {selectedRequest.is_editable ? 'فعال' : 'غیرفعال'}</p>
            </div>
            
            <div className="mb-4 border-t pt-4">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">📌 توضیحات مدیر:</h4>
              {editingDescription ? (
                <div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                    value={descriptionText}
                    onChange={(e) => setDescriptionText(e.target.value)}
                  />
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <button
                      onClick={handleSaveDescription}
                      className="bg-blue-600 text-white px-4 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      ذخیره
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(false);
                        setDescriptionText(selectedRequest.admin_description || '');
                      }}
                      className="bg-gray-300 text-gray-700 px-4 py-1 rounded-md hover:bg-gray-400 text-sm"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 bg-gray-50 p-2 rounded-md mb-2 text-sm">
                    {selectedRequest.admin_description || 'هنوز توضیحی ثبت نشده است.'}
                  </p>
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 text-sm"
                  >
                    ✏️ ویرایش توضیحات
                  </button>
                </div>
              )}
            </div>

            <h4 className="font-semibold mb-2 text-sm sm:text-base">محصولات درخواستی:</h4>
            {selectedRequest.items && selectedRequest.items.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:-mx-0">
                <table className="min-w-full bg-white border mb-4">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">نام محصول</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">نوع</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">تعداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.items.filter((item: any) => item.quantity > 0).map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm break-words max-w-[100px]">{item.product?.name || 'محصول حذف شده'}</td>
                        <td className="px-3 py-2 text-sm">{item.product?.type || '-'}</td>
                        <td className="px-3 py-2 text-sm">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">هیچ محصولی انتخاب نشده است</p>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;