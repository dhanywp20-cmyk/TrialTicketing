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
  photo_url?: string;
  photo_name?: string;
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
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketDetailPopup, setShowTicketDetailPopup] = useState(false);
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
    current_team: 'Team PTS'
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: '',
    action_taken: '',
    notes: '',
    new_status: 'Pending',
    file: null as File | null,
    photo: null as File | null,
    assign_to_services: false,
    services_assignee: ''
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    team_member: '',
    role: 'team',
    team_type: 'Team PTS'
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
        alert('Your session has expired. Please login again.');
      }
    }
  };

 const getNotifications = () => {
  if (!currentUser) return [];
  
  const member = teamMembers.find(m => m.username === currentUser.username);
  if (!member) return [];

  const assignedName = member.name;
  
  return tickets.filter(t => {
    const isAssignedToMe = t.assigned_to === assignedName;
    if (!isAssignedToMe) return false;

    if (member.team_type === 'Team PTS') {
      return t.current_team === 'Team PTS' && 
             (t.status === 'Pending' || t.status === 'In Progress');
    }
    
    if (member.team_type === 'Team Services') {
      return t.current_team === 'Team Services' && 
             t.services_status && 
             (t.services_status === 'Pending' || t.services_status === 'In Progress');
    }
    
    return false;
  });
};
  
  const formatDateTime = (dateString: string) => {
    const utcDate = new Date(dateString);
    const jakartaTime = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
    
    const day = String(jakartaTime.getUTCDate()).padStart(2, '0');
    const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0');
    const year = jakartaTime.getUTCFullYear();
    const hours = String(jakartaTime.getUTCHours()).padStart(2, '0');
    const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0');
    
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
        alert('Incorrect username or password!');
        return;
      }

      const now = Date.now();
      setCurrentUser(data);
      setIsLoggedIn(true);
      setLoginTime(now);
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());
    } catch (err) {
      alert('Login failed!');
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
        } 
        else if (currentUser?.role === 'team') {
          const member = membersData.data?.find((m: TeamMember) => m.username === currentUser.username);
          
          if (member?.team_type === 'Team Services') {
            const filteredTickets = ticketsData.data.filter((ticket: Ticket) => 
              ticket.current_team === 'Team Services'
            );
            setTickets(filteredTickets);
          } else {
            setTickets(ticketsData.data);
          }
        }
        else {
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
      alert('Project name, Issue case, and Assigned to must be filled!');
      return;
    }

    const validStatuses = ['Pending', 'In Progress', 'Solved'];
    if (!validStatuses.includes(newTicket.status)) {
      alert('Invalid status! Use: Pending, In Progress, or Solved');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Saving new ticket...');
      
      const ticketData = {
        project_name: newTicket.project_name,
        customer_phone: newTicket.customer_phone || null,
        sales_name: newTicket.sales_name || null,
        issue_case: newTicket.issue_case,
        description: newTicket.description || null,
        assigned_to: newTicket.assigned_to,
        date: newTicket.date,
        status: newTicket.status,
        current_team: 'Team PTS',
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
        current_team: 'Team PTS'
      });
      setShowNewTicket(false);
      
      await fetchData();
      
      setLoadingMessage('✅ Ticket saved successfully!');
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

 const uploadFile = async (file: File, folder: string = 'reports'): Promise<{ url: string; name: string }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ticket-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      
      if (uploadError.message.includes('row-level security') || 
          uploadError.message.includes('policy') ||
          uploadError.message.includes('new row violates')) {
        throw new Error(`STORAGE PERMISSION ERROR - Setup storage bucket policies first. See console for details.`);
      }
      
      throw uploadError;
    }

    const { data } = supabase.storage.from('ticket-photos').getPublicUrl(filePath);
    return { url: data.publicUrl, name: file.name };
  } catch (error: any) {
    console.error('Upload file error:', error);
    throw error;
  }
};

  const addActivity = async () => {
    if (!newActivity.notes || !selectedTicket) {
      alert('Notes must be filled!');
      return;
    }

    const validStatuses = ['Pending', 'In Progress', 'Solved'];
    if (!validStatuses.includes(newActivity.new_status)) {
      alert('Invalid status! Use: Pending, In Progress, or Solved');
      return;
    }

    if (newActivity.assign_to_services && !newActivity.services_assignee) {
      alert('Select assignee from Team Services!');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Updating ticket status...');
      
      let fileUrl = '';
      let fileName = '';
      let photoUrl = '';
      let photoName = '';

      if (newActivity.file) {
        setLoadingMessage('Uploading PDF file...');
        try {
          const result = await uploadFile(newActivity.file, 'reports');
          fileUrl = result.url;
          fileName = result.name;
        } catch (uploadErr: any) {
          console.error('File upload error:', uploadErr);
          setShowLoadingPopup(false);
          setUploading(false);
          alert(uploadErr.message || 'Failed to upload PDF file. Please check console for details.');
          return;
        }
      }

      if (newActivity.photo) {
        setLoadingMessage('Uploading photo...');
        try {
          const result = await uploadFile(newActivity.photo, 'photos');
          photoUrl = result.url;
          photoName = result.name;
        } catch (uploadErr: any) {
          console.error('Photo upload error:', uploadErr);
          setShowLoadingPopup(false);
          setUploading(false);
          alert(uploadErr.message || 'Failed to upload photo. Please check console for details.');
          return;
        }
      }

      const member = teamMembers.find(m => m.username === currentUser?.username);
      const teamType = member?.team_type || 'Team PTS';

      setLoadingMessage('Saving activity log...');

      const activityData: any = {
        ticket_id: selectedTicket.id,
        handler_name: newActivity.handler_name,
        handler_username: currentUser?.username || '',
        action_taken: newActivity.action_taken || '',
        notes: newActivity.notes,
        new_status: newActivity.new_status,
        team_type: teamType,
        assigned_to_services: newActivity.assign_to_services || false,
        file_url: fileUrl || null,
        file_name: fileName || null,
        photo_url: photoUrl || null,
        photo_name: photoName || null
      };

      const { error: activityError } = await supabase
        .from('activity_logs')
        .insert([activityData]);
      
      if (activityError) {
        console.error('Activity log insert error:', activityError);
        throw new Error(`Failed to save activity log: ${activityError.message}`);
      }

      setLoadingMessage('Updating ticket status...');

      const updateData: any = {};
      
      if (teamType === 'Team PTS') {
        updateData.status = newActivity.new_status;
        
        if (newActivity.assign_to_services) {
          updateData.current_team = 'Team Services';
          updateData.services_status = 'Pending';
          updateData.assigned_to = newActivity.services_assignee;
        }
      } else if (teamType === 'Team Services') {
        updateData.services_status = newActivity.new_status;
      }

      const { error: updateError } = await supabase.from('tickets')
        .update(updateData)
        .eq('id', selectedTicket.id);

      if (updateError) {
        console.error('Ticket update error:', updateError);
        throw new Error(`Failed to update ticket: ${updateError.message}`);
      }

      setNewActivity({
        handler_name: newActivity.handler_name,
        action_taken: '',
        notes: '',
        new_status: 'Pending',
        file: null,
        photo: null,
        assign_to_services: false,
        services_assignee: ''
      });
      
      await fetchData();
      
      setLoadingMessage('✅ Status updated successfully!');
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
      alert('All fields must be filled!');
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

      setNewUser({ username: '', password: '', full_name: '', team_member: '', role: 'team', team_type: 'Team PTS' });
      await fetchData();
      alert('User created successfully!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const addGuestMapping = async () => {
    if (!newMapping.guestUsername || !newMapping.projectName) {
      alert('All fields must be filled!');
      return;
    }

    const guestUser = users.find(u => u.username === newMapping.guestUsername && u.role === 'guest');
    if (!guestUser) {
      alert('Guest username not found or not a guest role!');
      return;
    }

    const projectExists = tickets.some(t => t.project_name === newMapping.projectName);
    if (!projectExists) {
      alert('Project name not found!');
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
      alert('Guest mapping added successfully!');
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
      alert('Guest mapping deleted successfully!');
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
    }
  };

  const updatePassword = async () => {
    if (!selectedUserForPassword) {
      alert('Select user first!');
      return;
    }

    if (!changePassword.current || !changePassword.new || !changePassword.confirm) {
      alert('All fields must be filled!');
      return;
    }

    if (changePassword.new !== changePassword.confirm) {
      alert('New password does not match!');
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
        alert('Old password is incorrect!');
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

      alert('Password changed successfully!');
      setChangePassword({ current: '', new: '', confirm: '' });
      setSelectedUserForPassword('');
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
            .activity { border: 1px solid #ddd; padding: 10px; margin: 10px 0; }
            .team-badge { display: inline-block; padding: 4px 8px; background: #e5e7eb; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .photo-thumbnail { max-width: 200px; margin: 10px 0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Ticket Report</h1>
          <h2>${ticket.project_name}</h2>
          <table>
            <tr><th>Issue</th><td>${ticket.issue_case}</td></tr>
            <tr><th>Phone</th><td>${ticket.customer_phone || '-'}</td></tr>
            <tr><th>Sales</th><td>${ticket.sales_name || '-'}</td></tr>
            <tr><th>Status Team PTS</th><td>${ticket.status}</td></tr>
            ${ticket.services_status ? `<tr><th>Status Team Services</th><td>${ticket.services_status}</td></tr>` : ''}
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
              ${log.assigned_to_services ? '<br/><strong style="color: #EF4444;">→ Assigned to Team Services</strong>' : ''}
              ${log.photo_url ? `<br/><img src="${log.photo_url}" class="photo-thumbnail" alt="Activity photo"/>` : ''}
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

  const teamPTSMembers = useMemo(() => teamMembers.filter(m => m.team_type === 'Team PTS'), [teamMembers]);
  const teamServicesMembers = useMemo(() => teamMembers.filter(m => m.team_type === 'Team Services'), [teamMembers]);

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
        alert('Your session has expired. Please login again.');
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
    if (!currentUser) return 'Team PTS';
    const member = teamMembers.find(m => m.username === currentUser.username);
    return member?.team_type || 'Team PTS';
  }, [currentUser, teamMembers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/images/Background.jpg)' }}>
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/images/Background.jpg)' }}>
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
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border-3 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200"
                placeholder="Enter password"
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
    <div className="min-h-screen p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/images/Background.jpg)' }}>
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

      <div className="max-w-[1600px] mx-auto">
        {/* Notification Popup */}
        {showNotificationPopup && notifications.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-500 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🔔</span>
                <h3 className="text-xl font-bold text-gray-800">Ticket Notifications</h3>
              </div>
              <p className="text-gray-700 mb-4">
                You have <strong className="text-red-600">{notifications.length}</strong> tickets that need attention:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {notifications.map(ticket => (
                  <div key={ticket.id} className={`p-3 rounded-lg border-2 ${statusColors[currentUserTeamType === 'Team Services' ? (ticket.services_status || 'Pending') : ticket.status]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm flex-1">{ticket.project_name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                        {ticket.current_team}
                      </span>
                    </div>
                    <p className="text-xs">{ticket.issue_case}</p>
                    <span className="text-xs font-semibold">{currentUserTeamType === 'Team Services' ? (ticket.services_status || 'Pending') : ticket.status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowNotificationPopup(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Continue with rest of UI from original... */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-1">
                📋 Reminder Troubleshooting
              </h1>
              <p className="text-gray-800 font-bold text-lg">PTS IVP</p>
              <p className="text-sm text-gray-600">
                Welcome: <span className="font-bold text-red-600">{currentUser?.full_name}</span>
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">
                  {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'team' ? `Team - ${currentUserTeamType}` : 'Guest'}
                </span>
              </p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-3 rounded-xl hover:from-yellow-600 hover:to-yellow-700 font-bold shadow-lg transition-all"
                title="Notifications"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {canAccessAccountSettings && (
                <>
                  <button 
                    onClick={() => {
                      setShowAccountSettings(!showAccountSettings);
                      setShowGuestMapping(false);
                      setShowNewTicket(false);
                    }} 
                    className="btn-secondary"
                  >
                    ⚙️ Account
                  </button>
                  <button 
                    onClick={() => {
                      setShowGuestMapping(!showGuestMapping);
                      setShowAccountSettings(false);
                      setShowNewTicket(false);
                    }} 
                    className="btn-teal"
                  >
                    👥 Guest Mapping
                  </button>
                </>
              )}
              {canCreateTicket && (
                <button 
                  onClick={() => {
                    setShowNewTicket(!showNewTicket);
                    setShowAccountSettings(false);
                    setShowGuestMapping(false);
                  }} 
                  className="btn-primary"
                >
                  + New Ticket
                </button>
              )}
              <button onClick={handleLogout} className="btn-danger">
                🚶 Logout
              </button>
            </div>
          </div>
        </div>

        {/* Rest of components will be added in next update... */}
        
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
        .btn-danger {
          @apply bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-lg transition-all;
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
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
