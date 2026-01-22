'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface TeamMember {
  id: string;
  name: string;
  username: string;
  photo_url: string;
  role: string;
  team_group: string;
}

interface ActivityLog {
  id: string;
  handler_name: string;
  handler_username: string;
  handler_group: string;
  action_taken: string;
  notes: string;
  file_url: string;
  file_name: string;
  new_status: string;
  escalated_to_services: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  project_name: string;
  customer_phone: string;
  sales_name: string;
  issue_case: string;
  description: string;
  assigned_to: string;
  status: string;
  pts_status: string;
  services_status: string;
  current_handler_group: string;
  date: string;
  created_at: string;
  created_by?: string;
  activity_logs?: ActivityLog[];
}

interface GuestMapping {
  id: string;
  guest_username: string;
  project_name: string;
  created_at: string;
}

export default function TicketingSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginTime, setLoginTime] = useState<number | null>(null);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [guestMappings, setGuestMappings] = useState<GuestMapping[]>([]);
  
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showGuestMapping, setShowGuestMapping] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [searchProject, setSearchProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showTicketList, setShowTicketList] = useState(true);

  const [newMapping, setNewMapping] = useState({
    guestUsername: '',
    projectName: ''
  });

  const [newTicket, setNewTicket] = useState({
    project_name: '',
    customer_phone: '',
    sales_name: '',
    issue_case: '',
    description: '',
    assigned_to: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending'
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: '',
    action_taken: '',
    notes: '',
    new_status: 'Pending',
    escalate_to_services: false,
    services_handler: '',
    file: null as File | null
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    team_member: '',
    role: 'team'
  });

  const [changePassword, setChangePassword] = useState({
    selectedUserId: '',
    current: '',
    new: '',
    confirm: ''
  });

  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-400',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-400',
    'Solved': 'bg-green-100 text-green-800 border-green-400'
  };

  const checkSessionTimeout = () => {
    if (loginTime) {
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - loginTime > sixHours) {
        handleLogout();
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
      }
    }
  };

  const getNotifications = () => {
    if (!currentUser) return [];
    
    const member = teamMembers.find(m => m.username === currentUser.username);
    const assignedName = member ? member.name : currentUser.full_name;
    
    return tickets.filter(t => 
      t.assigned_to === assignedName && 
      (t.status === 'Pending' || t.status === 'In Progress')
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDate = date.getUTCDate();
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    const utcSeconds = date.getUTCSeconds();
    
    const jakartaDate = new Date(Date.UTC(utcYear, utcMonth, utcDate, utcHours + 7, utcMinutes, utcSeconds));
    
    const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
    const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
    const year = jakartaDate.getUTCFullYear();
    const hours = String(jakartaDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jakartaDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jakartaDate.getUTCSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  };

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

      const now = Date.now();
      setCurrentUser(data);
      setIsLoggedIn(true);
      setLoginTime(now);
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());
    } catch (err) {
      alert('Login gagal!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginTime(null);
    setSelectedTicket(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
  };

  const fetchGuestMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_mappings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuestMappings(data || []);
    } catch (err: any) {
      console.error('Error fetching guest mappings:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [ticketsData, membersData, usersData] = await Promise.all([
        supabase.from('tickets').select('*, activity_logs(*)').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('users').select('id, username, full_name, role')
      ]);

      if (ticketsData.data) {
        if (currentUser?.role === 'guest') {
          const { data: mappings } = await supabase
            .from('guest_mappings')
            .select('project_name')
            .eq('guest_username', currentUser.username);

          if (mappings && mappings.length > 0) {
            const allowedProjectNames = mappings.map((m: GuestMapping) => m.project_name);
            const filteredTickets = ticketsData.data.filter((ticket: Ticket) => 
              allowedProjectNames.includes(ticket.project_name)
            );
            setTickets(filteredTickets);
            
            if (selectedTicket && !allowedProjectNames.includes(selectedTicket.project_name)) {
              setSelectedTicket(null);
            }
          } else {
            setTickets([]);
            setSelectedTicket(null);
          }
        } else {
          setTickets(ticketsData.data);
        }
      }
      
      if (membersData.data) setTeamMembers(membersData.data);
      if (usersData.data) setUsers(usersData.data);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.project_name || !newTicket.issue_case || !newTicket.assigned_to) {
      alert('Project name, Issue case, dan Assigned to harus diisi!');
      return;
    }

    const validStatuses = ['Pending', 'In Progress', 'Solved'];
    if (!validStatuses.includes(newTicket.status)) {
      alert('Status tidak valid! Gunakan: Pending, In Progress, atau Solved');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Menyimpan ticket baru...');
      
      const ticketData = {
        project_name: newTicket.project_name,
        customer_phone: newTicket.customer_phone || null,
        sales_name: newTicket.sales_name || null,
        issue_case: newTicket.issue_case,
        description: newTicket.description || null,
        assigned_to: newTicket.assigned_to,
        date: newTicket.date,
        status: newTicket.status,
        current_handler_group: 'PTS',
        pts_status: newTicket.status,
        created_by: currentUser?.username || null
      };

      const { error } = await supabase.from('tickets').insert([ticketData]);
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setNewTicket({
        project_name: '',
        customer_phone: '',
        sales_name: '',
        issue_case: '',
        description: '',
        assigned_to: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });
      setShowNewTicket(false);
      
      await fetchData();
      
      setLoadingMessage('✅ Ticket berhasil disimpan!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert('Error: ' + err.message);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `reports/${fileName}`;

    const { error } = await supabase.storage.from('ticket-photos').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('ticket-photos').getPublicUrl(filePath);
    return { url: data.publicUrl, name: file.name };
  };

  const addActivity = async () => {
    if (!newActivity.notes || !selectedTicket) {
      alert('Notes harus diisi!');
      return;
    }

    const validStatuses = ['Pending', 'In Progress', 'Solved'];
    if (!validStatuses.includes(newActivity.new_status)) {
      alert('Status tidak valid! Gunakan: Pending, In Progress, atau Solved');
      return;
    }

    if (newActivity.escalate_to_services && !newActivity.services_handler) {
      alert('Pilih handler dari Services untuk escalation!');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Mengupdate status ticket...');
      
      let fileUrl = '';
      let fileName = '';

      if (newActivity.file) {
        setLoadingMessage('Mengupload file...');
        const result = await uploadFile(newActivity.file);
        fileUrl = result.url;
        fileName = result.name;
      }

      const currentMember = teamMembers.find(m => m.name === newActivity.handler_name);
      const handlerGroup = currentMember?.team_group || 'PTS';

      await supabase.from('activity_logs').insert([{
        ticket_id: selectedTicket.id,
        handler_name: newActivity.handler_name,
        handler_username: currentUser?.username,
        handler_group: handlerGroup,
        action_taken: newActivity.action_taken || null,
        notes: newActivity.notes,
        new_status: newActivity.new_status,
        escalated_to_services: newActivity.escalate_to_services,
        file_url: fileUrl || null,
        file_name: fileName || null
      }]);

      let updateData: any = { status: newActivity.new_status };

      if (handlerGroup === 'PTS') {
        updateData.pts_status = newActivity.new_status;
      } else if (handlerGroup === 'Services') {
        updateData.services_status = newActivity.new_status;
      }

      if (newActivity.escalate_to_services) {
        updateData.current_handler_group = 'Services';
        updateData.assigned_to = newActivity.services_handler;
        updateData.services_status = 'Pending';
      }

      await supabase.from('tickets')
        .update(updateData)
        .eq('id', selectedTicket.id);

      setNewActivity({
        handler_name: newActivity.handler_name,
        action_taken: '',
        notes: '',
        new_status: 'Pending',
        escalate_to_services: false,
        services_handler: '',
        file: null
      });
      
      await fetchData();
      
      setLoadingMessage('✅ Status berhasil diupdate!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
        setShowUpdateForm(false);
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert('Error: ' + err.message);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      alert('Semua field harus diisi!');
      return;
    }

    try {
      await supabase.from('users').insert([{
        username: newUser.username,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role
      }]);

      if (newUser.team_member) {
        await supabase.from('team_members')
          .update({ username: newUser.username })
          .eq('name', newUser.team_member);
      }

      setNewUser({ username: '', password: '', full_name: '', team_member: '', role: 'team' });
      await fetchData();
      alert('User berhasil dibuat!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const addGuestMapping = async () => {
    if (!newMapping.guestUsername || !newMapping.projectName) {
      alert('Semua field harus diisi!');
      return;
    }

    const guestUser = users.find(u => u.username === newMapping.guestUsername && u.role === 'guest');
    if (!guestUser) {
      alert('Username guest tidak ditemukan atau bukan role guest!');
      return;
    }

    const projectExists = tickets.some(t => t.project_name === newMapping.projectName);
    if (!projectExists) {
      alert('Nama project tidak ditemukan!');
      return;
    }

    try {
      setUploading(true);
      const { error } = await supabase.from('guest_mappings').insert([{
        guest_username: newMapping.guestUsername,
        project_name: newMapping.projectName
      }]);

      if (error) throw error;

      setNewMapping({ guestUsername: '', projectName: '' });
      await fetchGuestMappings();
      setUploading(false);
      alert('Mapping guest berhasil ditambahkan!');
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
    }
  };

  const deleteGuestMapping = async (mappingId: string) => {
    try {
      setUploading(true);
      const { error } = await supabase
        .from('guest_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      await fetchGuestMappings();
      setUploading(false);
      alert('Mapping guest berhasil dihapus!');
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
    }
  };

  const updatePassword = async () => {
    if (!changePassword.selectedUserId) {
      alert('Pilih user terlebih dahulu!');
      return;
    }

    if (!changePassword.new || !changePassword.confirm) {
      alert('Password baru dan konfirmasi harus diisi!');
      return;
    }

    if (changePassword.new !== changePassword.confirm) {
      alert('Password baru tidak cocok!');
      return;
    }

    try {
      await supabase.from('users')
        .update({ password: changePassword.new })
        .eq('id', changePassword.selectedUserId);

      if (currentUser?.id === changePassword.selectedUserId) {
        const updatedUser = { ...currentUser!, password: changePassword.new };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      alert('Password berhasil diubah!');
      setChangePassword({ selectedUserId: '', current: '', new: '', confirm: '' });
      await fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const exportToPDF = async (ticket: Ticket) => {
    const printContent = `
      <html>
        <head>
          <title>Ticket Report - ${ticket.project_name}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #EF4444; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
            .escalation { background: #f3e8ff; padding: 10px; margin: 10px 0; border-left: 4px solid #a855f7; }
          </style>
        </head>
        <body>
          <h1>Ticket Report</h1>
          <h2>${ticket.project_name}</h2>
          <table>
            <tr><th>Issue</th><td>${ticket.issue_case}</td></tr>
            <tr><th>Phone</th><td>${ticket.customer_phone || '-'}</td></tr>
            <tr><th>Sales</th><td>${ticket.sales_name || '-'}</td></tr>
            <tr><th>Status</th><td>${ticket.status}</td></tr>
            ${ticket.pts_status ? `<tr><th>PTS Status</th><td>${ticket.pts_status}</td></tr>` : ''}
            ${ticket.services_status ? `<tr><th>Services Status</th><td>${ticket.services_status}</td></tr>` : ''}
            ${ticket.current_handler_group ? `<tr><th>Current Handler</th><td>${ticket.current_handler_group}</td></tr>` : ''}
            <tr><th>Date</th><td>${ticket.date}</td></tr>
          </table>
          <h3>Activity Log</h3>
          ${ticket.activity_logs?.map(log => `
            <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
              <strong>${log.handler_name}</strong> [${log.handler_group}] - ${formatDateTime(log.created_at)}<br/>
              Status: ${log.new_status}<br/>
              ${log.escalated_to_services ? '<div class="escalation">🔄 Escalated to Services</div>' : ''}
              ${log.action_taken ? `Action: ${log.action_taken}<br/>` : ''}
              Notes: ${log.notes}
            </div>
          `).join('') || 'No activities'}
        </body>
      </html>
    `;
    
    const win = window.open('', '', 'height=700,width=700');
    win?.document.write(printContent);
    win?.document.close();
    win?.print();
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const match = t.project_name.toLowerCase().includes(searchProject.toLowerCase()) ||
                    t.issue_case.toLowerCase().includes(searchProject.toLowerCase()) ||
                    (t.sales_name && t.sales_name.toLowerCase().includes(searchProject.toLowerCase()));
      const statusMatch = filterStatus === 'All' || t.status === filterStatus;
      return match && statusMatch;
    });
  }, [tickets, searchProject, filterStatus]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const processing = tickets.filter(t => t.status === 'In Progress').length;
    const pending = tickets.filter(t => t.status === 'Pending').length;
    const solved = tickets.filter(t => t.status === 'Solved').length;
    
    return {
      total, pending, processing, solved,
      statusData: [
        { name: 'Pending', value: pending, color: '#FCD34D' },
        { name: 'In Progress', value: processing, color: '#60A5FA' },
        { name: 'Solved', value: solved, color: '#34D399' }
      ].filter(d => d.value > 0),
      handlerData: Object.entries(
        tickets.reduce((acc, t) => {
          acc[t.assigned_to] = (acc[t.assigned_to] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, tickets]) => ({ name, tickets }))
    };
  }, [tickets]);

  const uniqueProjectNames = useMemo(() => {
    const names = tickets.map(t => t.project_name);
    return Array.from(new Set(names)).sort();
  }, [tickets]);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    const savedTime = localStorage.getItem('loginTime');
    
    if (saved && savedTime) {
      const user = JSON.parse(saved);
      const time = parseInt(savedTime);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - time > sixHours) {
        handleLogout();
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setLoginTime(time);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser && teamMembers.length > 0) {
      const member = teamMembers.find(m => m.username === currentUser.username);
      if (member) {
        setNewActivity(prev => ({ 
          ...prev, 
          handler_name: member.name,
          escalate_to_services: false,
          services_handler: ''
        }));
      } else {
        setNewActivity(prev => ({ 
          ...prev, 
          handler_name: currentUser.full_name,
          escalate_to_services: false,
          services_handler: ''
        }));
      }
    }
  }, [currentUser, teamMembers]);

  useEffect(() => {
    if (isLoggedIn && tickets.length > 0) {
      const notifs = getNotifications();
      setNotifications(notifs);
      
      if (notifs.length > 0 && !showNotificationPopup) {
        setShowNotificationPopup(true);
      }
    }
  }, [tickets, isLoggedIn, currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkSessionTimeout();
    }, 60000);

    return () => clearInterval(interval);
  }, [loginTime]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchGuestMappings();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const canCreateTicket = currentUser?.role !== 'guest';
  const canUpdateTicket = currentUser?.role !== 'guest';
  const canAccessAccountSettings = currentUser?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border-4 border-red-600">
          <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
            Login
          </h1>
          <p className="text-center text-gray-700 font-bold mb-6">Reminder Troubleshooting<br/>PTS IVP</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border-3 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border-3 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200"
                placeholder="Masukkan password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all"
            >
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-blue-500 animate-scale-in">
            <div className="flex flex-col items-center">
              {loadingMessage.includes('✅') ? (
                <div className="text-6xl mb-4 animate-bounce">✅</div>
              ) : (
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              )}
              <p className="text-xl font-bold text-gray-800 text-center">{loadingMessage}</p>
            </div>
          </div>
        </div>
      )}

      {uploading && !showLoadingPopup && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {showNotifications && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🔔</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">Notifikasi Ticket</h3>
                      {notifications.length > 0 && (
                        <p className="text-sm text-white/90">
                          {notifications.length} ticket perlu ditangani
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 font-bold transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg font-medium">Tidak ada notifikasi</p>
                  <p className="text-sm mt-2">Semua ticket sudah ditangani</p>
                </div>
              ) : (
                <div className="max-h-[calc(80vh-120px)] overflow-y-auto p-4">
                  <div className="space-y-3">
                    {notifications.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowNotifications(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-bold text-lg text-gray-800">{ticket.project_name}</p>
                            <p className="text-sm text-gray-600 mt-1">{ticket.issue_case}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[ticket.status]} ml-3`}>
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                          <span className="text-xs text-gray-500">
                            📅 {new Date(ticket.created_at).toLocaleDateString('id-ID')}
                          </span>
                          <span className="text-sm text-blue-600 font-semibold">Klik untuk lihat detail →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {showNotificationPopup && notifications.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-500 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🔔</span>
                <h3 className="text-xl font-bold text-gray-800">Notifikasi Ticket</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Anda memiliki <strong className="text-red-600">{notifications.length}</strong> ticket yang perlu ditangani:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {notifications.map(ticket => (
                  <div key={ticket.id} className={`p-3 rounded-lg border-2 ${statusColors[ticket.status]}`}>
                    <p className="font-bold text-sm">{ticket.project_name}</p>
                    <p className="text-xs">{ticket.issue_case}</p>
                    <span className="text-xs font-semibold">{ticket.status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowNotificationPopup(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
