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
  team_type?: string;
}

interface TeamMember {
  id: string;
  name: string;
  username: string;
  photo_url: string;
  role: string;
  team_type: string;
}

interface ActivityLog {
  id: string;
  handler_name: string;
  handler_username: string;
  action_taken: string;
  notes: string;
  file_url: string;
  file_name: string;
  new_status: string;
  team_type: string;
  assigned_to_services?: boolean;
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
  date: string;
  created_at: string;
  created_by?: string;
  current_team: string;
  services_status?: string;
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

  const [selectedUserForPassword, setSelectedUserForPassword] = useState('');

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
    status: 'Pending',
    current_team: 'PTS Team'
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: '',
    action_taken: '',
    notes: '',
    new_status: 'Pending',
    file: null as File | null,
    assign_to_services: false,
    services_Assigned: ''
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    team_member: '',
    role: 'team',
    team_type: 'PTS Team'
  });

  const [changePassword, setChangePassword] = useState({
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
        alert('Session Timeout. login again.');
      }
    }
  };

  const getNotifications = () => {
    if (!currentUser) return [];
    
    const member = teamMembers.find(m => m.username === currentUser.username);
    const assignedName = member ? member.name : currentUser.full_name;
    
    return tickets.filter(t => {
      const isPending = t.status === 'Pending' || t.status === 'In Progress';
      const isServicesAndPending = t.services_status && (t.services_status === 'Pending' || t.services_status === 'In Progress');
      
      if (member?.team_type === 'Services Team') {
        return t.assigned_to === assignedName && isServicesAndPending;
      } else {
        return t.assigned_to === assignedName && isPending;
      }
    });
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
        alert('Username or password is wrong!');
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
    } catch (err) {
      console.error('Error fetching guest mappings:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [ticketsData, membersData, usersData] = await Promise.all([
        supabase.from('tickets').select('*, activity_logs(*)').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('users').select('id, username, full_name, role, team_type')
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
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.project_name || !newTicket.issue_case || !newTicket.assigned_to) {
      alert('Project name, Issue case, and Assigned to must be insert!');
      return;
    }

    const validStatuses = ['Pending', 'In Progress', 'Solved'];
    if (!validStatuses.includes(newTicket.status)) {
      alert('Status not valid! use: Pending, In Progress, or Solved');
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
        current_team: 'PTS Team ',
        services_status: null,
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
        status: 'Pending',
        current_team: 'PTS Team'
      });
      setShowNewTicket(false);
      
      await fetchData();
      
      setLoadingMessage('✅ The Ticket has been saved!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
      }, 1500);
    } catch (err) {
      setShowLoadingPopup(false);
      setUploading(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert('Error: ' + errorMessage);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string }> => {
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
      alert('Status not valid! use: Pending, In Progress, or Solved');
      return;
    }

    if (newActivity.assign_to_services && !newActivity.services_Assigned) {
      alert('choose assigned to Services Team !');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Updateing status...');
      
      let fileUrl = '';
      let fileName = '';

      if (newActivity.file) {
        setLoadingMessage('Uploading the file...');
        const result = await uploadFile(newActivity.file);
        fileUrl = result.url;
        fileName = result.name;
      }

      const member = teamMembers.find(m => m.username === currentUser?.username);
      const teamType = member?.team_type || 'PTS Team';

      await supabase.from('activity_logs').insert([{
        ticket_id: selectedTicket.id,
        handler_name: newActivity.handler_name,
        handler_username: currentUser?.username,
        action_taken: newActivity.action_taken || null,
        notes: newActivity.notes,
        new_status: newActivity.new_status,
        team_type: teamType,
        assigned_to_services: newActivity.assign_to_services,
        file_url: fileUrl || null,
        file_name: fileName || null
      }]);

      const updateData: Record<string, string> = {};
      
      if (teamType === 'PTS Team') {
        updateData.status = newActivity.new_status;
        
        if (newActivity.assign_to_services) {
          updateData.current_team = 'Services Team';
          updateData.services_status = 'Pending';
          updateData.assigned_to = newActivity.services_Assigned;
        }
      } else if (teamType === 'Services Team') {
        updateData.services_status = newActivity.new_status;
      }

      await supabase.from('tickets')
        .update(updateData)
        .eq('id', selectedTicket.id);

      setNewActivity({
        handler_name: newActivity.handler_name,
        action_taken: '',
        notes: '',
        new_status: 'Pending',
        file: null,
        assign_to_services: false,
        services_Assigned: ''
      });
      
      await fetchData();
      
      setLoadingMessage('✅ Status has been updated!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
        setShowUpdateForm(false);
      }, 1500);
    } catch (err) {
      setShowLoadingPopup(false);
      setUploading(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert('Error: ' + errorMessage);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      alert('All field must be insert!');
      return;
    }

    try {
      await supabase.from('users').insert([{
        username: newUser.username,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
        team_type: newUser.team_type
      }]);

      if (newUser.team_member) {
        await supabase.from('team_members')
          .update({ username: newUser.username })
          .eq('name', newUser.team_member);
      }

      setNewUser({ username: '', password: '', full_name: '', team_member: '', role: 'team', team_type: 'PTS Team ' });
      await fetchData();
      alert('User has been created!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert('Error: ' + errorMessage);
    }
  };

  const addGuestMapping = async () => {
    if (!newMapping.guestUsername || !newMapping.projectName) {
      alert('All field must be insert!');
      return;
    }

    const guestUser = users.find(u => u.username === newMapping.guestUsername && u.role === 'guest');
    if (!guestUser) {
      alert('Username guest not be found or role not guest!');
      return;
    }

    const projectExists = tickets.some(t => t.project_name === newMapping.projectName);
    if (!projectExists) {
      alert('Project name not be found!');
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
      alert('Mapping guest has been added!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert('Error: ' + errorMessage);
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
      alert('Mapping has been delete!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert('Error: ' + errorMessage);
      setUploading(false);
    }
  };

  const updatePassword = async () => {
    if (!selectedUserForPassword) {
      alert('Select The User fisrt !');
      return;
    }

    if (!changePassword.current || !changePassword.new || !changePassword.confirm) {
      alert('All field must be insert!');
      return;
    }

    if (changePassword.new !== changePassword.confirm) {
      alert('New Password not equal!');
      return;
    }

    try {
      const selectedUser = users.find(u => u.id === selectedUserForPassword);
      if (!selectedUser) {
        alert('User not found!');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('password')
        .eq('id', selectedUserForPassword)
        .single();

      if (!userData || userData.password !== changePassword.current) {
        alert('Old Password is wrong!');
        return;
      }

      await supabase.from('users')
        .update({ password: changePassword.new })
        .eq('id', selectedUserForPassword);

      if (currentUser?.id === selectedUserForPassword) {
        const updatedUser = { ...currentUser, password: changePassword.new };
        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      alert('Password has been changes!');
      setChangePassword({ current: '', new: '', confirm: '' });
      setSelectedUserForPassword('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert('Error: ' + errorMessage);
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
            .activity { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
            .team-badge { display: inline-block; padding: 4px 8px; background: #e5e7eb; border-radius: 4px; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Ticket Report</h1>
          <h2><tr>${ticket.project_name}</tr></h2>
          <table>
            <tr><th>Issue</th><td>${ticket.issue_case}</td></tr>
            <tr><th>User Phone</th><td>${ticket.customer_phone || '-'}</td></tr>
            <tr><th>Sales Project</th><td>${ticket.sales_name || '-'}</td></tr>
            <tr><th>PTS Team Status</th><td>${ticket.status}</td></tr>
            ${ticket.services_status ? `<tr><th>Services Team status</th><td>${ticket.services_status}</td></tr>` : ''}
            <tr><th>Current Team</th><td>${ticket.current_team}</td></tr>
            <tr><th>Date</th><td>${ticket.date}</td></tr>
          </table>
          <h3>Activity Log</h3>
          ${ticket.activity_logs?.map(log => `
            <div class="activity">
              <strong>${log.handler_name}</strong> <span class="team-badge">${log.team_type}</span> - ${formatDateTime(log.created_at)}<br/>
              Status: ${log.new_status}<br/>
              ${log.action_taken ? `Action: ${log.action_taken}<br/>` : ''}
              Notes: ${log.notes}
              ${log.assigned_to_services ? '<br/><strong style="color: #EF4444;">→ Assigned to Services Team </strong>' : ''}
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

  const teamPTSMembers = useMemo(() => teamMembers.filter(m => m.team_type === 'PTS Team '), [teamMembers]);
  const teamServicesMembers = useMemo(() => teamMembers.filter(m => m.team_type === 'Services Team '), [teamMembers]);

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
        alert('Session is timeout. Please login again.');
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
        setNewActivity(prev => ({ ...prev, handler_name: member.name }));
      } else {
        setNewActivity(prev => ({ ...prev, handler_name: currentUser.full_name }));
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

  const currentUserTeamType = useMemo(() => {
    if (!currentUser) return 'PTS Team';
    const member = teamMembers.find(m => m.username === currentUser.username);
    return member?.team_type || 'PTS Team';
  }, [currentUser, teamMembers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/images/Loading.jpg)' }}>
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/images/Loading.jpg)' }}>
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border-4 border-red-600">
          <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
            Login
          </h1>
          <p className="text-center text-gray-700 font-bold mb-6">Reminder Troubleshooting<br/>IVP Product</p>
          
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
    <div className="min-h-screen p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/images/Loading.jpg)' }}>
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
        {/* Notification Modal */}
        {showNotificationPopup && notifications.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in">
              <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6">
                <h2 className="text-2xl font-bold">🔔 Notifikasi Ticket</h2>
                <p className="text-sm mt-1">Anda memiliki {notifications.length} ticket yang perlu ditangani</p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {notifications.map((ticket) => (
                  <div key={ticket.id} className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-400 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-gray-800">{ticket.project_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2"><strong>Issue:</strong> {ticket.issue_case}</p>
                    <p className="text-sm text-gray-600 mb-2"><strong>Assigned to:</strong> {ticket.assigned_to}</p>
                    <p className="text-xs text-gray-500">Date: {ticket.date}</p>
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowNotificationPopup(false);
                        setShowTicketList(false);
                      }}
                      className="mt-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-900 font-bold text-sm transition-all"
                    >
                      Lihat Detail
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-gray-100 flex justify-end">
                <button
                  onClick={() => setShowNotificationPopup(false)}
                  className="btn-secondary"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 mb-6 border-4 border-red-600">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
                🎫 Ticketing System IVP
              </h1>
              <p className="text-sm text-gray-600 mt-1">Welcome, <strong>{currentUser?.full_name}</strong> ({currentUser?.role})</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowNotificationPopup(true)}
                  className="relative bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 py-2 rounded-xl hover:from-yellow-600 hover:to-orange-700 font-bold shadow-lg transition-all"
                >
                  🔔 Notifikasi
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>
              )}
              {canCreateTicket && (
                <button
                  onClick={() => {
                    setShowNewTicket(true);
                    setShowDashboard(false);
                    setShowAccountSettings(false);
                    setShowGuestMapping(false);
                    setSelectedTicket(null);
                    setShowTicketList(false);
                  }}
                  className="btn-primary"
                >
                  ➕ New Ticket
                </button>
              )}
              <button
                onClick={() => {
                  setShowDashboard(!showDashboard);
                  setShowNewTicket(false);
                  setShowAccountSettings(false);
                  setShowGuestMapping(false);
                  setSelectedTicket(null);
                  setShowTicketList(false);
                }}
                className="btn-teal"
              >
                📊 Dashboard
              </button>
              {canAccessAccountSettings && (
                <>
                  <button
                    onClick={() => {
                      setShowAccountSettings(!showAccountSettings);
                      setShowNewTicket(false);
                      setShowDashboard(false);
                      setShowGuestMapping(false);
                      setSelectedTicket(null);
                      setShowTicketList(false);
                    }}
                    className="btn-purple"
                  >
                    ⚙️ Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowGuestMapping(!showGuestMapping);
                      setShowNewTicket(false);
                      setShowDashboard(false);
                      setShowAccountSettings(false);
                      setSelectedTicket(null);
                      setShowTicketList(false);
                    }}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-5 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-900 font-bold shadow-lg transition-all"
                  >
                    👥 Guest Mapping
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowTicketList(true);
                  setShowNewTicket(false);
                  setShowDashboard(false);
                  setShowAccountSettings(false);
                  setShowGuestMapping(false);
                  setSelectedTicket(null);
                }}
                className="btn-secondary"
              >
                📋 Ticket List
              </button>
              <button
                onClick={handleLogout}
                className="btn-danger"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard View */}
        {showDashboard && (
          <div className="space-y-6 animate-slide-down">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-700">
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="text-sm">Total Tickets</div>
              </div>
              <div className="stat-card bg-gradient-to-br from-yellow-500 to-yellow-700">
                <div className="text-3xl font-bold">{stats.pending}</div>
                <div className="text-sm">Pending</div>
              </div>
              <div className="stat-card bg-gradient-to-br from-purple-500 to-purple-700">
                <div className="text-3xl font-bold">{stats.processing}</div>
                <div className="text-sm">In Progress</div>
              </div>
              <div className="stat-card bg-gradient-to-br from-green-500 to-green-700">
                <div className="text-3xl font-bold">{stats.solved}</div>
                <div className="text-sm">Solved</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="chart-container">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Status Distribution</h3>
                {stats.statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-20">No data available</p>
                )}
              </div>

              <div className="chart-container">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Tickets by Handler</h3>
                {stats.handlerData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.handlerData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tickets" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-20">No data available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New Ticket Form */}
        {showNewTicket && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-blue-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
              ➕ Create New Ticket
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Project Name *</label>
                <input
                  type="text"
                  value={newTicket.project_name}
                  onChange={(e) => setNewTicket({...newTicket, project_name: e.target.value})}
                  className="input-field"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Customer Phone</label>
                <input
                  type="text"
                  value={newTicket.customer_phone}
                  onChange={(e) => setNewTicket({...newTicket, customer_phone: e.target.value})}
                  className="input-field"
                  placeholder="Enter customer phone"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Sales Name</label>
                <input
                  type="text"
                  value={newTicket.sales_name}
                  onChange={(e) => setNewTicket({...newTicket, sales_name: e.target.value})}
                  className="input-field"
                  placeholder="Enter sales name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Issue Case *</label>
                <input
                  type="text"
                  value={newTicket.issue_case}
                  onChange={(e) => setNewTicket({...newTicket, issue_case: e.target.value})}
                  className="input-field"
                  placeholder="Enter issue case"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  className="input-field"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Assigned To *</label>
                <select
                  value={newTicket.assigned_to}
                  onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})}
                  className="input-field"
                >
                  <option value="">Select handler</option>
                  {teamPTSMembers.map(member => (
                    <option key={member.id} value={member.name}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Status</label>
                <select
                  value={newTicket.status}
                  onChange={(e) => setNewTicket({...newTicket, status: e.target.value})}
                  className="input-field"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Solved">Solved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Date</label>
                <input
                  type="date"
                  value={newTicket.date}
                  onChange={(e) => setNewTicket({...newTicket, date: e.target.value})}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={createTicket} className="btn-primary">
                💾 Save Ticket
              </button>
              <button
                onClick={() => setShowNewTicket(false)}
                className="btn-secondary"
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Account Settings */}
        {showAccountSettings && (
          <div className="space-y-6 animate-slide-down">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-purple-500">
              <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">
                👤 Create New User
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Username *</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                    className="input-field"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Password *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="input-field"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                    className="input-field"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="input-field"
                  >
                    <option value="team">Team</option>
                    <option value="admin">Admin</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Team Type</label>
                  <select
                    value={newUser.team_type}
                    onChange={(e) => setNewUser({...newUser, team_type: e.target.value})}
                    className="input-field"
                  >
                    <option value="PTS Team">PTS Team</option>
                    <option value="Services Team">Services Team</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Link to Team Member (Optional)</label>
                  <select
                    value={newUser.team_member}
                    onChange={(e) => setNewUser({...newUser, team_member: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select team member</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>{member.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={createUser} className="btn-primary mt-6">
                ✅ Create User
              </button>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-orange-500">
              <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-800">
                🔐 Change Password
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2">Select User *</label>
                  <select
                    value={selectedUserForPassword}
                    onChange={(e) => setSelectedUserForPassword(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select user</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name} ({user.username})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Current Password *</label>
                  <input
                    type="password"
                    value={changePassword.current}
                    onChange={(e) => setChangePassword({...changePassword, current: e.target.value})}
                    className="input-field"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">New Password *</label>
                  <input
                    type="password"
                    value={changePassword.new}
                    onChange={(e) => setChangePassword({...changePassword, new: e.target.value})}
                    className="input-field"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2">Confirm New Password *</label>
                  <input
                    type="password"
                    value={changePassword.confirm}
                    onChange={(e) => setChangePassword({...changePassword, confirm: e.target.value})}
                    className="input-field"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <button onClick={updatePassword} className="btn-primary mt-6">
                🔄 Update Password
              </button>
            </div>
          </div>
        )}

        {/* Guest Mapping */}
        {showGuestMapping && (
          <div className="space-y-6 animate-slide-down">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-indigo-500">
              <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
                ➕ Add Guest Mapping
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Guest Username *</label>
                  <select
                    value={newMapping.guestUsername}
                    onChange={(e) => setNewMapping({...newMapping, guestUsername: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select guest user</option>
                    {users.filter(u => u.role === 'guest').map(user => (
                      <option key={user.id} value={user.username}>{user.full_name} ({user.username})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Project Name *</label>
                  <select
                    value={newMapping.projectName}
                    onChange={(e) => setNewMapping({...newMapping, projectName: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select project</option>
                    {uniqueProjectNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={addGuestMapping} className="btn-primary mt-6">
                ✅ Add Mapping
              </button>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-gray-300">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">📋 Guest Mappings List</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">Guest Username</th>
                      <th className="px-4 py-3 text-left font-bold">Project Name</th>
                      <th className="px-4 py-3 text-left font-bold">Created At</th>
                      <th className="px-4 py-3 text-left font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestMappings.map((mapping) => (
                      <tr key={mapping.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{mapping.guest_username}</td>
                        <td className="px-4 py-3">{mapping.project_name}</td>
                        <td className="px-4 py-3">{formatDateTime(mapping.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteGuestMapping(mapping.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 font-bold text-sm"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Ticket List */}
        {showTicketList && !selectedTicket && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-gray-300 animate-slide-down">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📋 All Tickets</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold mb-2">Search Project/Issue/Sales</label>
                <input
                  type="text"
                  value={searchProject}
                  onChange={(e) => setSearchProject(e.target.value)}
                  className="input-field"
                  placeholder="Search..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Solved">Solved</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Project Name</th>
                    <th className="px-4 py-3 text-left font-bold">Issue</th>
                    <th className="px-4 py-3 text-left font-bold">Assigned To</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-left font-bold">Current Team</th>
                    <th className="px-4 py-3 text-left font-bold">Date</th>
                    <th className="px-4 py-3 text-left font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold">{ticket.project_name}</td>
                      <td className="px-4 py-3">{ticket.issue_case}</td>
                      <td className="px-4 py-3">{ticket.assigned_to}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[ticket.status]}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-800">
                          {ticket.current_team}
                        </span>
                      </td>
                      <td className="px-4 py-3">{ticket.date}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowTicketList(false);
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 font-bold text-sm"
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ticket Detail View */}
        {selectedTicket && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-4 border-green-500 animate-slide-down">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800">
                  🎫 Ticket Detail
                </h2>
                <p className="text-sm text-gray-600 mt-1">Project: <strong>{selectedTicket.project_name}</strong></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToPDF(selectedTicket)}
                  className="btn-export"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={() => {
                    setSelectedTicket(null);
                    setShowTicketList(true);
                  }}
                  className="btn-secondary"
                >
                  ⬅️ Back
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                <p className="text-sm text-gray-600 mb-1">Issue Case</p>
                <p className="font-bold text-lg">{selectedTicket.issue_case}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                <p className="font-bold text-lg">{selectedTicket.assigned_to}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                <p className="text-sm text-gray-600 mb-1">PTS Team Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${statusColors[selectedTicket.status]}`}>
                  {selectedTicket.status}
                </span>
              </div>
              {selectedTicket.services_status && (
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                  <p className="text-sm text-gray-600 mb-1">Services Team Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${statusColors[selectedTicket.services_status]}`}>
                    {selectedTicket.services_status}
                  </span>
                </div>
              )}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                <p className="text-sm text-gray-600 mb-1">Current Team</p>
                <p className="font-bold text-lg">{selectedTicket.current_team}</p>
              </div>
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <p className="font-bold text-lg">{selectedTicket.date}</p>
              </div>
              {selectedTicket.customer_phone && (
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                  <p className="text-sm text-gray-600 mb-1">Customer Phone</p>
                  <p className="font-bold text-lg">{selectedTicket.customer_phone}</p>
                </div>
              )}
              {selectedTicket.sales_name && (
                <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                  <p className="text-sm text-gray-600 mb-1">Sales Name</p>
                  <p className="font-bold text-lg">{selectedTicket.sales_name}</p>
                </div>
              )}
              {selectedTicket.description && (
                <div className="md:col-span-2 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border-2 border-gray-300">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="font-bold">{selectedTicket.description}</p>
                </div>
              )}
            </div>

            {canUpdateTicket && (
              <div className="mb-6">
                <button
                  onClick={() => setShowUpdateForm(!showUpdateForm)}
                  className="btn-primary"
                >
                  {showUpdateForm ? '❌ Cancel Update' : '✏️ Update Status'}
                </button>
              </div>
            )}

            {showUpdateForm && canUpdateTicket && (
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border-2 border-blue-400">
                <h3 className="text-xl font-bold mb-4 text-blue-800">Update Ticket Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Handler Name</label>
                    <input
                      type="text"
                      value={newActivity.handler_name}
                      onChange={(e) => setNewActivity({...newActivity, handler_name: e.target.value})}
                      className="input-field"
                      placeholder="Handler name"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Action Taken</label>
                    <input
                      type="text"
                      value={newActivity.action_taken}
                      onChange={(e) => setNewActivity({...newActivity, action_taken: e.target.value})}
                      className="input-field"
                      placeholder="Action taken"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-2">Notes *</label>
                    <textarea
                      value={newActivity.notes}
                      onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                      className="input-field"
                      rows={3}
                      placeholder="Enter notes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">New Status</label>
                    <select
                      value={newActivity.new_status}
                      onChange={(e) => setNewActivity({...newActivity, new_status: e.target.value})}
                      className="input-field"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Solved">Solved</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Upload File (Optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setNewActivity({...newActivity, file: e.target.files?.[0] || null})}
                      className="input-field"
                    />
                  </div>
                  {currentUserTeamType === 'PTS Team' && (
                    <>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newActivity.assign_to_services}
                            onChange={(e) => setNewActivity({...newActivity, assign_to_services: e.target.checked})}
                            className="w-5 h-5"
                          />
                          <span className="font-bold">Assign to Services Team</span>
                        </label>
                      </div>
                      {newActivity.assign_to_services && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold mb-2">Services Team Member *</label>
                          <select
                            value={newActivity.services_Assigned}
                            onChange={(e) => setNewActivity({...newActivity, services_Assigned: e.target.value})}
                            className="input-field"
                          >
                            <option value="">Select Services Team member</option>
                            {teamServicesMembers.map(member => (
                              <option key={member.id} value={member.name}>{member.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button onClick={addActivity} className="btn-primary mt-6">
                  💾 Save Update
                </button>
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">📝 Activity Log</h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {selectedTicket.activity_logs && selectedTicket.activity_logs.length > 0 ? (
                  selectedTicket.activity_logs.map((log) => (
                    <div key={log.id} className="activity-log">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-lg">{log.handler_name}</p>
                          <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-bold mt-1">
                            {log.team_type}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[log.new_status]}`}>
                            {log.new_status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">{formatDateTime(log.created_at)}</p>
                        </div>
                      </div>
                      {log.action_taken && (
                        <p className="text-sm mb-2"><strong>Action:</strong> {log.action_taken}</p>
                      )}
                      <p className="text-sm mb-2"><strong>Notes:</strong> {log.notes}</p>
                      {log.file_url && (
                        <a
                          href={log.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-download"
                        >
                          📎 {log.file_name}
                        </a>
                      )}
                      {log.assigned_to_services && (
                        <p className="text-sm font-bold text-red-600 mt-2">
                          → Assigned to Services Team
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-10">No activity logs yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .btn-primary {
          @apply bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all;
        }
        .btn-secondary {
          @apply bg-gradient-to-r from-gray-600 to-gray-800 text-white px-5 py-3 rounded-xl hover:from-gray-700 hover:to-gray-900 font-bold shadow-lg transition-all;
        }
        .btn-teal {
          @apply bg-gradient-to-r from-teal-600 to-teal-800 text-white px-5 py-3 rounded-xl hover:from-teal-700 hover:to-teal-900 font-bold shadow-lg transition-all;
        }
        .btn-purple {
          @apply bg-gradient-to-r from-purple-600 to-purple-800 text-white px-5 py-3 rounded-xl hover:from-purple-700 hover:to-purple-900 font-bold shadow-lg transition-all;
        }
        .btn-danger {
          @apply bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-lg transition-all;
        }
        .btn-export {
          @apply bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold text-sm transition-all;
        }
        .activity-log {
          @apply bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 shadow-md;
        }
        .stat-card {
          @apply rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform;
        }
        .chart-container {
          @apply bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-3 border-gray-300 shadow-xl;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .file-download {
          @apply inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-all mt-2;
        }
        .input-field {
          @apply w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all font-medium bg-white shadow-sm;
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
