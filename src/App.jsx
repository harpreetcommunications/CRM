import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Settings, Search, Edit, Trash2, Clock, BookOpen, CheckCircle, IndianRupee, Download, File, Hash, Printer, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserSessionPersistence, sendEmailVerification } from 'firebase/auth';

// ==========================================
// 🛑 ADMIN SETTING: Ethe apni Email ID likho
// ==========================================
const ADMIN_EMAIL = "harpreetscommunication@gmail.com"; 

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customersList, setCustomersList] = useState([]); 
  const [dashboardFilter, setDashboardFilter] = useState('All'); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Landing Page vs Login vs Sign Up
  const [showLogin, setShowLogin] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  // Multi-User Cloud Settings States
  const [shopName, setShopName] = useState('Loading...');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');

  // Admin States
  const [isAdmin, setIsAdmin] = useState(false);
  const [allShops, setAllShops] = useState([]);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('Airtel Xstream Fiber');
  const [serviceDescription, setServiceDescription] = useState(''); 
  const [totalAmount, setTotalAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDocs, setReceivedDocs] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [acknowledgeNo, setAcknowledgeNo] = useState(''); 
  const [workStatus, setWorkStatus] = useState('Completed'); 
  const [pendingReason, setPendingReason] = useState(''); 
  const [editingId, setEditingId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // User & Trial States
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  const auth = getAuth();

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
        // Check if Admin
        if (currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Multi-User Data & Trial Fetcher
  useEffect(() => {
    let unsubscribeCustomers;
    let unsubscribeUser;
    let unsubscribeAllShops;

    if (user) {
      // 1. Fetch User Data (Settings & Trial Status)
      unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setShopName(userData.shopName || 'My Business');
          setShopAddress(userData.shopAddress || '');
          setShopPhone(userData.shopPhone || '');

          if (userData.trialEndDate) {
            const endDate = new Date(userData.trialEndDate);
            const today = new Date();
            if (today > endDate && user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
              // Admin ka trial kade expire nahi hunda
              setIsTrialExpired(true);
              setTrialDaysLeft(0);
            } else {
              setIsTrialExpired(false);
              const diffTime = endDate - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
              setTrialDaysLeft(diffDays > 0 ? diffDays : 0);
            }
          }
        }
      });

      // 2. Fetch Only THIS User's Customers
      const q = query(collection(db, "customers"), where("userId", "==", user.uid));
      unsubscribeCustomers = onSnapshot(q, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setCustomersList(data.reverse());
      });

      // 3. ADMIN ONLY: Fetch All Shops
      if (isAdmin) {
        unsubscribeAllShops = onSnapshot(collection(db, "users"), (snapshot) => {
          const shopsData = [];
          snapshot.forEach((doc) => shopsData.push({ id: doc.id, ...doc.data() }));
          setAllShops(shopsData);
        });
      }
    }

    return () => {
      if (unsubscribeCustomers) unsubscribeCustomers();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeAllShops) unsubscribeAllShops();
    };
  }, [user, isAdmin]);

  // LOGIN & SIGN UP FUNCTION WITH EMAIL VERIFICATION
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      await setPersistence(auth, browserSessionPersistence);
      
      if (isSignUpMode) {
        const userCredential = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        const newUser = userCredential.user;
        
        await sendEmailVerification(newUser);
        
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30); 
        
        await setDoc(doc(db, "users", newUser.uid), {
          email: loginEmail,
          trialEndDate: trialEnd.toISOString(),
          shopName: "My New Shop",
          shopAddress: "Add Address in Settings",
          shopPhone: "",
          joinDate: new Date().toLocaleDateString('en-IN')
        });
        
        alert("Account Created! A verification link has been sent to your email. Please check your inbox (and spam folder) and verify your email to log in.");
        await signOut(auth);
        
        setLoginEmail('');
        setLoginPassword('');
        setIsSignUpMode(false); 
        
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        
        if (!userCredential.user.emailVerified) {
          alert("Please verify your email first! Check your inbox for the verification link.");
          await signOut(auth);
        }
      }
    } catch (error) {
      alert("Auth Error: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      setShowLogin(false);
      setIsDropdownOpen(false); 
      setLoginEmail(''); 
      setLoginPassword('');
    });
  };

  const toggleAuthMode = () => {
    setIsSignUpMode(!isSignUpMode);
    setLoginEmail('');
    setLoginPassword('');
  };

  const saveShopSettings = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", user.uid), {
        shopName: shopName,
        shopAddress: shopAddress,
        shopPhone: shopPhone
      });
      alert("Shop Settings Saved to Cloud Successfully!");
    } catch (error) {
      alert("Error saving settings: " + error.message);
    }
  };

  // ADMIN ACTION: Extend Subscription
  const handleExtendSubscription = async (shopId) => {
    if (window.confirm("Do you want to add 1 Year to this shop's subscription?")) {
      const newDate = new Date();
      newDate.setFullYear(newDate.getFullYear() + 1);
      await updateDoc(doc(db, "users", shopId), {
        trialEndDate: newDate.toISOString()
      });
      alert("Success! Subscription extended for 1 year.");
    }
  };

  // ADMIN ACTION: Block Shop
  const handleBlockShop = async (shopId) => {
    if (window.confirm("Are you sure you want to BLOCK this shop? (Their access will be revoked immediately)")) {
      const pastDate = new Date("2000-01-01"); // Set date to past to expire trial
      await updateDoc(doc(db, "users", shopId), {
        trialEndDate: pastDate.toISOString()
      });
      alert("Shop has been blocked!");
    }
  };

  // CRUD Functions for Customers
  const handleEditClick = (cust) => {
    setCustomerName(cust.name); setPhone(cust.phone); setService(cust.service); setServiceDescription(cust.serviceDescription || ''); 
    const tAmount = cust.totalAmount !== undefined ? cust.totalAmount : (cust.amount || 0);
    const rAmount = cust.receivedAmount !== undefined ? cust.receivedAmount : (cust.paymentStatus === 'Paid' ? tAmount : 0);
    setTotalAmount(tAmount); setReceivedAmount(rAmount); setReceivedDocs(cust.receivedDocs || ''); setReceiptNo(cust.receiptNo || ''); setAcknowledgeNo(cust.acknowledgeNo || ''); 
    setWorkStatus(cust.workStatus || 'Completed'); setPendingReason(cust.pendingReason || ''); setEditingId(cust.id); setActiveTab('customers'); 
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) await deleteDoc(doc(db, "customers", id));
  };

  const handleClearUdhaar = async (cust) => {
    if(window.confirm(`Did ${cust.name} pay the pending due of ₹${cust.dueAmount}?`)) {
      await updateDoc(doc(db, "customers", cust.id), { receivedAmount: cust.totalAmount, dueAmount: 0 });
      alert("Payment received! Due cleared successfully.");
    }
  };

  const handleCompleteWork = async (cust) => {
    if(window.confirm(`Is the pending work for ${cust.name} completed now?`)) {
      await updateDoc(doc(db, "customers", cust.id), { workStatus: 'Completed', pendingReason: '' });
      alert("Work marked as completed!");
    }
  };

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!customerName || !totalAmount) return alert("Please enter the Customer Name and Total Amount!");
    const total = Number(totalAmount); const received = Number(receivedAmount) || 0; const due = total - received;
    let finalReceiptNo = receiptNo;
    if (!editingId && !finalReceiptNo) {
      const today = new Date();
      finalReceiptNo = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(customersList.length + 1).padStart(3, '0')}`;
    }
    const recordData = {
      userId: user.uid, name: customerName, phone: phone, service: service, serviceDescription: serviceDescription,
      totalAmount: total, receivedAmount: received, dueAmount: due, receivedDocs: receivedDocs, receiptNo: finalReceiptNo,
      acknowledgeNo: acknowledgeNo, workStatus: workStatus, pendingReason: workStatus === 'Pending' ? pendingReason : '', date: new Date().toLocaleDateString('en-IN')
    };

    if (editingId) {
      await updateDoc(doc(db, "customers", editingId), recordData); alert("Record updated successfully!");
    } else {
      await addDoc(collection(db, "customers"), recordData); alert("New record saved successfully! Receipt No: " + finalReceiptNo);
    }
    setCustomerName(''); setPhone(''); setService('Airtel Xstream Fiber'); setServiceDescription(''); 
    setTotalAmount(''); setReceivedAmount(''); setReceivedDocs(''); setReceiptNo(''); setAcknowledgeNo('');
    setWorkStatus('Completed'); setPendingReason(''); setEditingId(null); setActiveTab('dashboard'); 
  };

  const normalizedList = customersList.map(c => {
    const total = c.totalAmount !== undefined ? c.totalAmount : (c.amount || 0);
    const received = c.receivedAmount !== undefined ? c.receivedAmount : (c.paymentStatus === 'Paid' ? total : 0);
    const due = c.dueAmount !== undefined ? c.dueAmount : (total - received);
    return { ...c, totalAmount: total, receivedAmount: received, dueAmount: due };
  });

  const totalCustomers = normalizedList.length;
  const totalRevenue = normalizedList.reduce((sum, c) => sum + c.receivedAmount, 0);
  const totalUdhaar = normalizedList.reduce((sum, c) => sum + c.dueAmount, 0);
  const pendingTasks = normalizedList.filter(c => c.workStatus === 'Pending').length;

  const filteredDashboardData = normalizedList.filter(cust => {
    const matchesSearch = cust.name.toLowerCase().includes(searchTerm.toLowerCase()) || (cust.phone && cust.phone.includes(searchTerm)) || (cust.receiptNo && cust.receiptNo.toLowerCase().includes(searchTerm.toLowerCase())) || (cust.acknowledgeNo && cust.acknowledgeNo.toLowerCase().includes(searchTerm.toLowerCase()));
    let matchesFilter = true;
    if (dashboardFilter === 'PendingWork') matchesFilter = cust.workStatus === 'Pending';
    else if (dashboardFilter === 'CompletedWork') matchesFilter = cust.workStatus === 'Completed';
    else if (dashboardFilter === 'Udhaar') matchesFilter = cust.dueAmount > 0;
    else if (dashboardFilter === 'Paid') matchesFilter = cust.dueAmount === 0;
    return matchesSearch && matchesFilter;
  });

  const ledgerData = normalizedList.filter(cust => cust.dueAmount > 0 || cust.workStatus === 'Pending');

  const handleExportExcel = () => {
    if (filteredDashboardData.length === 0) return alert("No data to export!");
    let csvContent = "data:text/csv;charset=utf-8,S.No.,Date,Service Name,Service Description,Customer Name,Mobile Number,Received Documents,Due Amount,Paid Amount,Balance Status,Service Status,Receipt No.,Acknowledge No.\n";
    filteredDashboardData.forEach((cust, index) => {
      const balanceStatus = cust.dueAmount > 0 ? "Pending" : "Clear";
      const cleanDesc = cust.serviceDescription ? `"${cust.serviceDescription.replace(/"/g, '""')}"` : '';
      const cleanDocs = cust.receivedDocs ? `"${cust.receivedDocs.replace(/"/g, '""')}"` : '';
      const cleanName = `"${cust.name.replace(/"/g, '""')}"`;
      const cleanReceipt = cust.receiptNo ? `"${cust.receiptNo.replace(/"/g, '""')}"` : '';
      const cleanAck = cust.acknowledgeNo ? `"${cust.acknowledgeNo.replace(/"/g, '""')}"` : '';
      const row = `${index + 1},${cust.date},${cust.service},${cleanDesc},${cleanName},${cust.phone || ''},${cleanDocs},${cust.dueAmount},${cust.receivedAmount},${balanceStatus},${cust.workStatus},${cleanReceipt},${cleanAck}`;
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `${shopName.replace(/\s+/g, '_')}_Records.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handlePrintBill = (invoice) => {
    const printWindow = window.open('', '_blank', 'width=850,height=650');
    if (!printWindow) return alert("Popup blocked! Please allow popups for this site to print the bill.");
    const shopPhoneText = shopPhone ? ` | Ph: ${shopPhone}` : '';
    const printHtml = `<!DOCTYPE html><html><head><title>Invoice - ${invoice.name}</title><style>body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; background: #fff; } .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e5e7eb; padding: 40px; border-radius: 12px; } .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 32px; } .header h1 { margin: 0; font-size: 32px; text-transform: uppercase; letter-spacing: 2px; color: #1f2937; } .header p { margin: 5px 0; color: #6b7280; font-size: 14px; } .badge { display: inline-block; padding: 6px 20px; background: #eff6ff; color: #2563eb; font-weight: bold; border-radius: 20px; margin-top: 20px; font-size: 16px; } .flex-between { display: flex; justify-content: space-between; margin-bottom: 35px; } .text-right { text-align: right; } .label { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; } .val { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; } table { width: 100%; border-collapse: collapse; margin-bottom: 35px; } th, td { padding: 15px; border: 1px solid #e5e7eb; text-align: left; } th { background: #f3f4f6; color: #374151; font-weight: bold; text-transform: uppercase; font-size: 14px; } .right-align { text-align: right; } .desc-text { color: #4b5563; font-size: 14px; margin-top: 5px; } .summary { width: 300px; float: right; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; } .sum-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 15px; color: #374151; font-weight: 500;} .sum-row.total { font-weight: bold; font-size: 18px; color: #111827; border-top: 2px solid #e5e7eb; margin-top: 10px; padding-top: 10px; } .footer { clear: both; text-align: center; padding-top: 40px; color: #6b7280; font-style: italic; font-size: 14px; } .print-btn { display: block; margin: 40px auto 0; padding: 12px 30px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; } @media print { body { padding: 0; } .invoice-box { border: none; padding: 0; } .no-print { display: none !important; } }</style></head><body><div class="invoice-box"><div class="header"><h1>${shopName}</h1><p>${shopAddress}${shopPhoneText}</p><div class="badge">INVOICE / RECEIPT</div></div><div class="flex-between"><div><div class="label">Billed To:</div><div class="val">${invoice.name}</div><div style="color: #4b5563; font-weight: 500;">${invoice.phone || 'N/A'}</div></div><div class="text-right"><div class="label">Date:</div><div class="val" style="font-size: 16px;">${invoice.date}</div><div class="label">Receipt No:</div><div class="val" style="font-size: 16px;">${invoice.receiptNo || 'N/A'}</div>${invoice.acknowledgeNo ? `<div class="label" style="margin-top:10px;">Acknowledge No:</div><div class="val" style="font-size: 16px;">${invoice.acknowledgeNo}</div>` : ''}</div></div><table><thead><tr><th>Service Description</th><th class="right-align" style="width:120px;">Amount</th></tr></thead><tbody><tr><td><strong style="font-size: 16px; color: #1f2937;">${invoice.service}</strong><div class="desc-text">${invoice.serviceDescription || ''}</div></td><td class="right-align"><strong style="font-size: 16px;">₹${invoice.totalAmount}</strong></td></tr></tbody></table><div class="summary"><div class="sum-row"><span>Total Bill:</span><span style="font-weight: bold;">₹${invoice.totalAmount}</span></div><div class="sum-row" style="color: #16a34a;"><span>Paid Amount:</span><span style="font-weight: bold;">₹${invoice.receivedAmount}</span></div><div class="sum-row total"><span>Due Balance:</span><span style="color: #dc2626;">₹${invoice.dueAmount}</span></div></div><div class="footer">Thank you for trusting ${shopName}!</div><button class="no-print print-btn" onclick="window.print()">Print This Bill</button></div><script>window.onload = function() { window.print(); }</script></body></html>`;
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // ================= UNAUTHENTICATED SCREENS =================
  if (!user) {
    if (!showLogin) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
          <nav className="bg-white shadow-sm px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 p-2 rounded-lg"><LayoutDashboard className="w-6 h-6 text-white" /></div>
              <h1 className="text-2xl font-black text-gray-800 tracking-wider">HC's <span className="text-blue-600">Professional CRM</span></h1>
            </div>
            <button onClick={() => setShowLogin(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition shadow-sm">Login / Start Free Trial</button>
          </nav>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
            <h2 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">Manage Your Shop <br/><span className="text-blue-600">Like a Pro.</span></h2>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl">The ultimate all-in-one billing, ledger, and customer management system designed specifically for digital service centers, repair shops, and cyber cafes.</p>
            <button onClick={() => { setIsSignUpMode(true); setShowLogin(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg transition flex items-center hover:scale-105 transform duration-200">Start Your 30-Day Free Trial <span className="ml-2">→</span></button>
          </div>
          <div className="bg-white py-16 px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center border-t border-gray-200">
            <div className="p-6 rounded-xl border border-transparent hover:border-gray-100 hover:shadow-xl transition">
               <FileText className="w-14 h-14 text-blue-500 mx-auto mb-6 bg-blue-50 p-3 rounded-full" />
               <h3 className="text-xl font-bold mb-3 text-gray-800">Smart Invoicing</h3>
               <p className="text-gray-500">Generate and print professional white-labeled bills and receipts in just one click.</p>
            </div>
            <div className="p-6 rounded-xl border border-transparent hover:border-gray-100 hover:shadow-xl transition">
               <BookOpen className="w-14 h-14 text-blue-500 mx-auto mb-6 bg-blue-50 p-3 rounded-full" />
               <h3 className="text-xl font-bold mb-3 text-gray-800">Due Ledger & Khata</h3>
               <p className="text-gray-500">Keep a strict track of pending payments, udhaar, and completed work effortlessly.</p>
            </div>
            <div className="p-6 rounded-xl border border-transparent hover:border-gray-100 hover:shadow-xl transition">
               <Settings className="w-14 h-14 text-blue-500 mx-auto mb-6 bg-blue-50 p-3 rounded-full" />
               <h3 className="text-xl font-bold mb-3 text-gray-800">100% White-Label</h3>
               <p className="text-gray-500">Add your own shop name, address, and contact details automatically on every receipt.</p>
            </div>
          </div>
          <footer className="bg-slate-900 text-slate-400 text-center py-6 text-sm">&copy; {new Date().getFullYear()} Harpreet Communications. All rights reserved.</footer>
        </div>
      );
    } else {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-900 relative">
          <button onClick={() => { setShowLogin(false); setLoginEmail(''); setLoginPassword(''); }} className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center font-semibold">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Home
          </button>
          <form onSubmit={handleAuth} className="bg-white p-10 rounded-2xl shadow-2xl w-[400px]">
            <div className="flex justify-center mb-6"><div className="bg-blue-100 p-3 rounded-full"><Users className="w-8 h-8 text-blue-600" /></div></div>
            <h2 className="text-2xl font-black mb-2 text-center text-gray-800">{isSignUpMode ? 'Create Account' : 'Welcome Back'}</h2>
            <p className="text-center text-gray-500 mb-8 text-sm">{isSignUpMode ? 'Start your 30-day free trial today.' : 'Please enter your details to sign in.'}</p>
            <div className="space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label><input className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" type="email" value={loginEmail} placeholder="admin@shop.com" onChange={(e) => setLoginEmail(e.target.value)} required /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Password</label><input className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" type="password" value={loginPassword} placeholder="••••••••" onChange={(e) => setLoginPassword(e.target.value)} required /></div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold transition shadow-md mt-4">{isSignUpMode ? 'Sign Up & Start Trial' : 'Sign In to Dashboard'}</button>
            </div>
            <div className="text-center mt-6 text-sm text-gray-600">
              {isSignUpMode ? "Already have an account? " : "Don't have an account? "}
              <button type="button" onClick={toggleAuthMode} className="text-blue-600 font-bold hover:underline">{isSignUpMode ? 'Sign In' : 'Sign Up for Free'}</button>
            </div>
          </form>
        </div>
      );
    }
  }

  // ================= TRIAL EXPIRED LOCK SCREEN =================
  if (isTrialExpired) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 flex-col font-sans text-center px-4">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg border-t-4 border-red-500">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-gray-800 mb-4">Trial Expired</h2>
          <p className="text-gray-600 mb-8 text-lg">Your 30-Day Free Trial has ended. Please contact the administrator to upgrade to the Pro Yearly Plan.</p>
          <div className="bg-gray-50 p-4 rounded-lg mb-8">
            <h3 className="text-2xl font-bold text-blue-600">₹1,500 <span className="text-sm text-gray-500">/ year</span></h3>
            <p className="text-sm text-gray-500 mt-1">Unlimited Invoices & Data Storage</p>
          </div>
          <button onClick={handleLogout} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 p-4 rounded-lg font-bold transition text-lg mb-4">
            Logout
          </button>
        </div>
      </div>
    );
  }
  
  // ================= MAIN APP (AUTHENTICATED) =================
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col no-print">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-blue-400 leading-tight truncate">{shopName}</h1>
          <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest">Pro CRM</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto">
          <button onClick={() => {setActiveTab('dashboard'); setEditingId(null);}} className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}>
            <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
          </button>
          
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeTab === 'customers' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}>
            <Users className="w-5 h-5 mr-3" /> Add / Edit
          </button>
          
          <button onClick={() => setActiveTab('khata')} className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeTab === 'khata' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}>
            <BookOpen className="w-5 h-5 mr-3" /> Due Ledger
          </button>
          
          <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeTab === 'billing' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}>
            <FileText className="w-5 h-5 mr-3" /> Billing
          </button>

          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}>
            <Settings className="w-5 h-5 mr-3" /> Settings
          </button>

          {/* ADMIN ONLY TAB */}
          {isAdmin && (
            <div className="pt-6 mt-6 border-t border-slate-800">
              <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Admin Tools</p>
              <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeTab === 'admin' ? 'bg-red-600 text-white' : 'text-red-400 hover:bg-slate-800'}`}>
                <ShieldCheck className="w-5 h-5 mr-3" /> Super Admin
              </button>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden no-print">
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent border-none outline-none ml-2 w-full text-sm" />
          </div>
          <div className="flex items-center space-x-6">
            {!isAdmin && (
              <div className="hidden md:block">
                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1.5 rounded-full border border-yellow-200 shadow-sm">
                  Trial: {trialDaysLeft} Days Left
                </span>
              </div>
            )}
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md hover:bg-blue-700 transition">
              {shopName.charAt(0).toUpperCase()}
            </button>
          </div>

          {isDropdownOpen && (
            <div className="absolute right-8 top-16 bg-white shadow-xl rounded-lg p-2 w-40 border z-50">
              <div className="px-3 py-2 border-b border-gray-100 mb-2">
                <p className="text-xs text-gray-500 font-bold uppercase">Logged in as</p>
                <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-red-600 font-bold hover:bg-red-50 rounded transition">
                Logout
              </button>
            </div>
          )}
        </header>

        <div className="p-8 overflow-y-auto">
          
          {/* ================= TAB: DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Business Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                  <p className="text-sm text-gray-500 font-medium">Total Customers</p><h3 className="text-3xl font-bold text-gray-800 mt-2">{totalCustomers}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                  <p className="text-sm text-gray-500 font-medium">Revenue (Received)</p><h3 className="text-3xl font-bold text-gray-800 mt-2">₹{totalRevenue}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-red-500">
                  <p className="text-sm text-gray-500 font-medium">Market Due (Pending)</p><h3 className="text-3xl font-bold text-gray-800 mt-2">₹{totalUdhaar}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-yellow-500">
                  <p className="text-sm text-gray-500 font-medium">Pending Tasks</p><h3 className="text-3xl font-bold text-gray-800 mt-2">{pendingTasks}</h3>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="text-lg font-semibold text-gray-800">Customers Record</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                      <button onClick={() => setDashboardFilter('All')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${dashboardFilter === 'All' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>All</button>
                      <button onClick={() => setDashboardFilter('PendingWork')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${dashboardFilter === 'PendingWork' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500'}`}>Pending Work</button>
                      <button onClick={() => setDashboardFilter('Udhaar')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${dashboardFilter === 'Udhaar' ? 'bg-red-100 text-red-700' : 'text-gray-500'}`}>Due</button>
                      <button onClick={() => setDashboardFilter('Paid')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${dashboardFilter === 'Paid' ? 'bg-green-100 text-green-700' : 'text-gray-500'}`}>Paid</button>
                    </div>
                    <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-sm font-bold flex items-center transition shadow-sm"><Download className="w-4 h-4 mr-2" /> Export</button>
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                      <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Customer Name</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Receipt / Ack No.</th><th className="px-4 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100">
                      {filteredDashboardData.length === 0 ? (<tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">No records found...</td></tr>) : (
                        filteredDashboardData.map((cust) => (
                          <tr key={cust.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500">{cust.date}</td><td className="px-4 py-3 font-bold text-blue-600">{cust.name}</td><td className="px-4 py-3 text-gray-800 font-medium">{cust.service}</td><td className="px-4 py-3 text-gray-600">{cust.phone || '-'}</td><td className="px-4 py-3 font-bold text-red-600">₹{cust.dueAmount}</td>
                            <td className="px-4 py-3">{cust.dueAmount > 0 ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Due</span> : <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Clear</span>}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cust.receiptNo || '-'}<br/>{cust.acknowledgeNo && <span className="text-blue-500">{cust.acknowledgeNo}</span>}</td>
                            <td className="px-4 py-3 flex space-x-3 justify-end items-center"><button onClick={() => handleEditClick(cust)} className="text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteRecord(cust.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB: UDHAAR KHATA ================= */}
          {activeTab === 'khata' && (
            <div>
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Due Ledger & Pending Work</h2></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-800 text-white text-sm">
                    <tr><th className="px-6 py-4 rounded-tl-lg">Customer Name</th><th className="px-6 py-4">Due Amount</th><th className="px-6 py-4">Work Status</th><th className="px-6 py-4 rounded-tr-lg">Quick Actions</th></tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {ledgerData.length === 0 ? (<tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500 text-lg font-medium">Ledger is clear! 🎉</td></tr>) : (
                      ledgerData.map((cust) => (
                        <tr key={cust.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-bold text-gray-800 text-base">{cust.name}</td>
                          <td className="px-6 py-4">{cust.dueAmount > 0 ? <span className="text-red-600 font-bold text-base">₹{cust.dueAmount}</span> : <span className="text-gray-400">Clear</span>}</td>
                          <td className="px-6 py-4">{cust.workStatus === 'Pending' ? (<div><span className="text-yellow-600 font-bold flex items-center"><Clock className="w-4 h-4 mr-1" /> Pending</span>{cust.pendingReason && <div className="text-xs text-gray-500 mt-1">Reason: {cust.pendingReason}</div>}</div>) : (<span className="text-green-600 font-bold">Completed</span>)}</td>
                          <td className="px-6 py-4 flex space-x-2">
                            {cust.dueAmount > 0 && (<button onClick={() => handleClearUdhaar(cust)} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-md text-sm font-bold flex items-center"><IndianRupee className="w-4 h-4 mr-1" /> Mark Paid</button>)}
                            {cust.workStatus === 'Pending' && (<button onClick={() => handleCompleteWork(cust)} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md text-sm font-bold flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Mark Done</button>)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB: CUSTOMER FORM ================= */}
          {activeTab === 'customers' && (
            <div>
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Customer Management</h2></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">{editingId ? "Edit Customer Entry" : "Create New Entry"}</h3>
                <form onSubmit={handleSaveRecord} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label><input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                      <select value={service} onChange={(e) => setService(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none h-[42px]">
                        <option>Airtel Xstream Fiber</option><option>Online Form Fill</option><option>PC Time / Cyber Cafe</option><option>Mobile/PC Repair</option><option>Money Withdraw</option><option>Pan Card Apply</option><option>Pan Card Print</option><option>Adhar Card Print</option><option>Voter Card Apply</option><option>Voter Card Print</option><option>Passport Apply</option><option>PCC apply</option><option>Vehicle Insurance</option><option>Health Insurance</option><option>Life Insurance</option><option>Bill Payment</option><option>EMI Pay</option><option>Ticket Booking</option><option>Driving Licence apply</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Service Description (Details)</label><input type="text" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none h-[42px]" /></div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1"><File className="w-4 h-4 inline mr-1 text-gray-500"/> Received Docs</label><input type="text" value={receivedDocs} onChange={(e) => setReceivedDocs(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1"><Hash className="w-4 h-4 inline mr-1 text-gray-500"/> Receipt No.</label><input type="text" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" placeholder="Auto-generated..." /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1"><Hash className="w-4 h-4 inline mr-1 text-gray-500"/> Acknowledge No.</label><input type="text" value={acknowledgeNo} onChange={(e) => setAcknowledgeNo(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" placeholder="Govt Ref No..." /></div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 h-fit">
                    <label className="block text-sm font-semibold text-blue-900 mb-1">Service Status</label>
                    <select value={workStatus} onChange={(e) => setWorkStatus(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none bg-white">
                      <option value="Completed">✅ Completed / Done</option><option value="Pending">⏳ Work Pending</option>
                    </select>
                    {workStatus === 'Pending' && (
                      <div className="mt-3"><input type="text" value={pendingReason} onChange={(e) => setPendingReason(e.target.value)} className="w-full px-3 py-1.5 border rounded-md text-sm outline-none" placeholder="Pending reason..." /></div>
                    )}
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 md:col-span-2">
                    <h4 className="text-sm font-bold text-green-900 mb-3 border-b border-green-200 pb-1">Payment Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><label className="block text-sm font-semibold text-gray-700 mb-1">Total Amount (₹) *</label><input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-full px-4 py-2 border rounded-lg font-bold outline-none" required /></div>
                      <div><label className="block text-sm font-semibold text-gray-700 mb-1">Paid Amount (₹)</label><input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Due Amount (₹)</label>
                        <div className="w-full px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold">₹ {(Number(totalAmount) - (Number(receivedAmount) || 0)) > 0 ? (Number(totalAmount) - (Number(receivedAmount) || 0)) : 0}</div>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex space-x-4 pt-4">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition shadow-md">{editingId ? "Update Record" : "Save Record"}</button>
                    {editingId && <button type="button" onClick={() => { setEditingId(null); setActiveTab('dashboard'); }} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold">Cancel</button>}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= TAB: BILLING & INVOICES ================= */}
          {activeTab === 'billing' && (
            <div>
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Generate Invoices</h2></div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-blue-50 text-blue-900 text-sm">
                    <tr><th className="px-6 py-4 rounded-tl-lg">Date</th><th className="px-6 py-4">Receipt No.</th><th className="px-6 py-4">Customer Name</th><th className="px-6 py-4">Service</th><th className="px-6 py-4">Total Bill</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 rounded-tr-lg">Action</th></tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {normalizedList.length === 0 ? (<tr><td colSpan="7" className="px-6 py-8 text-center text-gray-500">No records found.</td></tr>) : (
                      normalizedList.map((cust) => (
                        <tr key={cust.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-500">{cust.date}</td><td className="px-6 py-4 font-mono text-gray-600">{cust.receiptNo || '-'}</td><td className="px-6 py-4 font-bold text-gray-800">{cust.name}</td><td className="px-6 py-4 text-gray-600">{cust.service}</td><td className="px-6 py-4 font-bold text-gray-800">₹{cust.totalAmount}</td>
                          <td className="px-6 py-4">{cust.dueAmount > 0 ? <span className="text-red-500 font-semibold">Due: ₹{cust.dueAmount}</span> : <span className="text-green-600 font-semibold">Fully Paid</span>}</td>
                          <td className="px-6 py-4"><button onClick={() => handlePrintBill(cust)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-md"><Printer className="w-4 h-4 mr-2" /> Print</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB: SETTINGS ================= */}
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Shop Settings</h2></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
                <p className="text-sm text-gray-500 mb-6">Update your business details below. These details are saved to the cloud and used on all printed invoices.</p>
                <form onSubmit={saveShopSettings} className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Shop/Business Name *</label><input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Complete Address *</label><input type="text" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} className="w-full px-4 py-2 border rounded-lg" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Number (Optional)</label><input type="text" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
                  <div className="pt-4"><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-md">Save Settings</button></div>
                </form>
              </div>
            </div>
          )}

          {/* ================= SUPER ADMIN PANEL ================= */}
          {isAdmin && activeTab === 'admin' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-red-600 flex items-center"><ShieldCheck className="w-8 h-8 mr-2"/> Super Admin Panel</h2>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-0 overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-900 text-white text-sm">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-lg">Shop Details</th>
                      <th className="px-6 py-4">Account Email</th>
                      <th className="px-6 py-4">Joined On</th>
                      <th className="px-6 py-4">Trial Status</th>
                      <th className="px-6 py-4 rounded-tr-lg">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {allShops.map((shop) => {
                       let isExpired = false;
                       let daysLeft = 0;
                       if (shop.trialEndDate) {
                         const endDate = new Date(shop.trialEndDate);
                         const today = new Date();
                         if (today > endDate) isExpired = true;
                         else {
                           const diffTime = endDate - today;
                           daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                         }
                       }
                       // Hide admin's own account from the block list if you want, or just show it
                       return (
                        <tr key={shop.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-800">{shop.shopName}</p>
                            <p className="text-xs text-gray-500">{shop.shopPhone || 'No phone'}</p>
                          </td>
                          <td className="px-6 py-4 text-blue-600 font-medium">{shop.email}</td>
                          <td className="px-6 py-4 text-gray-600">{shop.joinDate || 'N/A'}</td>
                          <td className="px-6 py-4">
                            {shop.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? (
                               <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Admin Account</span>
                            ) : isExpired ? (
                               <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Expired</span>
                            ) : (
                               <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{daysLeft} Days Left</span>
                            )}
                          </td>
                          <td className="px-6 py-4 flex space-x-3">
                            {shop.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                              <>
                                <button onClick={() => handleExtendSubscription(shop.id)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-xs font-bold border border-blue-200 hover:bg-blue-600 hover:text-white transition">
                                  + 1 Year
                                </button>
                                <button onClick={() => handleBlockShop(shop.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-md text-xs font-bold border border-red-200 hover:bg-red-600 hover:text-white transition">
                                  Block Access
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                       )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;