'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: string;
}

interface MenuItem {
  title: string;
  icon: string;
  color: string;
  items: {
    name: string;
    url: string;
    icon: string;
    external?: boolean;
  }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);

  const menuItems: MenuItem[] = [
    {
      title: 'Form BAST & Demo',
      icon: '📝',
      color: 'from-blue-500 to-blue-700',
      items: [
        {
          name: 'Input Form',
          url: 'https://portal.indovisual.co.id/form-review-demo-produk-bast-pts/',
          icon: '✍️',
          external: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/1hIpMsZIadnJu85FiJ5Qojn_fOcYLl3iMsBagzZI4LYM/edit?usp=sharing',
          icon: '📊',
          external: true
        }
      ]
    },
    {
      title: 'Ticket Troubleshooting',
      icon: '🎫',
      color: 'from-red-500 to-red-700',
      items: [
        {
          name: 'Sistem Ticketing',
          url: '/ticketing',
          icon: '🔧',
          external: false
        }
      ]
    },
    {
      title: 'Daily Report',
      icon: '📅',
      color: 'from-green-500 to-green-700',
      items: [
        {
          name: 'Input Form',
          url: 'https://forms.gle/xcuPjwYdPCRcB5z4A',
          icon: '✍️',
          external: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/19lriAzgdlhDotDFQaasLhtiyPyyICisikIfJMZekrsA/edit?usp=sharing',
          icon: '📊',
          external: true
        },
        {
          name: 'View Summary',
          url: 'https://1drv.ms/x/c/25d404c0b5ee2b43/IQCJgi4jzvzqR6FWF5SHnmK8ASY5gGnpq_9QNyTXzkOh1HQ?e=KTJqG6',
          icon: '📈',
          external: true
        }
      ]
    },
    {
      title: 'Database PTS',
      icon: '🛢️',
      color: 'from-purple-500 to-purple-700',
      items: [
        {
          name: 'Akses Database',
          url: 'https://www.indovisual.com',
          icon: '🔗',
          external: true
        }
      ]
    },
    {
      title: 'Keluar/Masuk Unit PTS Room',
      icon: '🚪',
      color: 'from-orange-500 to-orange-700',
      items: [
        {
          name: 'Kelola Unit',
          url: 'https://www.indovisual.com',
          icon: '📦',
          external: true
        }
      ]
    }
  ];

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .single();

      if (error || !data) {
        alert('Username atau password salah!');
        return;
      }

      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(data));
    } catch (err) {
      alert('Login gagal!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0]) => {
    if (item.external) {
      window.open(item.url, '_blank');
    } else {
      router.push(item.url);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border-4 border-red-600">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-2">
              Dashboard PTS IVP
            </h1>
            <p className="text-gray-700 font-bold">Portal Terpadu Support</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-800">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all bg-white"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-800">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all bg-white"
                placeholder="Masukkan password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-4 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all text-lg"
            >
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-cover bg-center bg-fixed" 
         style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-8 border-4 border-red-600">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-2">
                🏢 Dashboard PTS IVP
              </h1>
              <p className="text-gray-700 font-bold text-lg">Portal Terpadu Support - IndoVisual</p>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, <span className="font-bold text-red-600">{currentUser?.full_name}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-xl transition-all"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-2xl p-8 mb-8 text-white border-4 border-blue-900">
          <h2 className="text-3xl font-bold mb-3">Selamat Datang di Portal PTS IVP! 👋</h2>
          <p className="text-lg opacity-90">
            Pilih menu di bawah untuk mengakses sistem yang Anda butuhkan.
          </p>
        </div>

        {/* Main Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((menu, index) => (
            <div
              key={index}
              className="bg-white/40 backdrop-blur-md rounded-2xl shadow-xl border-3 border-gray-300 overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Menu Header */}
              <div className={`bg-gradient-to-r ${menu.color} p-6 text-white`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{menu.icon}</span>
                  <h3 className="text-xl font-bold">{menu.title}</h3>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-6 space-y-3">
                {menu.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={() => handleMenuClick(item)}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 px-6 py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-left flex items-center gap-3 border-2 border-gray-300 hover:border-gray-400"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="flex-1">{item.name}</span>
                    {item.external && (
                      <span className="text-sm text-gray-500">↗</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-white text-sm font-semibold drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-xl px-6 py-3 inline-block">
            © 2026 IndoVisual - Portal Terpadu Support (PTS IVP)
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
