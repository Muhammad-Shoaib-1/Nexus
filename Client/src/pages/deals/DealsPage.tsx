import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, DollarSign, TrendingUp, Users, Calendar, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface Deal {
  id: string;
  startup: { id?: string; name: string; logo: string; industry: string };
  amount: number;
  equity: number;
  stage: string;
  status: string;
  lastActivity: string;
}

const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C'];
const STATUSES = ['Due Diligence', 'Term Sheet', 'Negotiation', 'Closed', 'Passed'];

export const DealsPage: React.FC = () => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [entrepreneurs, setEntrepreneurs] = useState<any[]>([]);
  const [form, setForm] = useState({ entrepreneurId: '', amount: '', equity: '', stage: 'Seed' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getDeals().then(({ deals }) => setDeals(deals)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role === 'investor') {
      api.listUsers('entrepreneur').then(({ users }) => setEntrepreneurs(users));
    }
  }, [user]);

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Due Diligence': return 'primary';
      case 'Term Sheet': return 'secondary';
      case 'Negotiation': return 'accent';
      case 'Closed': return 'success';
      case 'Passed': return 'error';
      default: return 'gray';
    }
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchQuery === '' ||
      deal.startup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.startup.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(deal.status);
    return matchesSearch && matchesStatus;
  });

  // Real stats computed from actual deal data, not hardcoded
  const stats = useMemo(() => {
    const activeDeals = deals.filter(d => d.status !== 'Closed' && d.status !== 'Passed');
    const closedDeals = deals.filter(d => d.status === 'Closed');
    const totalInvestment = closedDeals.reduce((sum, d) => sum + d.amount, 0);
    const portfolioCompanies = new Set(closedDeals.map(d => d.startup.name)).size;
    const now = new Date();
    const closedThisMonth = closedDeals.filter(d => {
      const activityDate = new Date(d.lastActivity);
      return activityDate.getMonth() === now.getMonth() && activityDate.getFullYear() === now.getFullYear();
    }).length;

    return {
      totalInvestment,
      activeDeals: activeDeals.length,
      portfolioCompanies,
      closedThisMonth
    };
  }, [deals]);

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entrepreneurId || !form.amount || !form.equity) return;
    setSubmitting(true);
    try {
      const { deal } = await api.createDeal(
        form.entrepreneurId,
        Number(form.amount),
        Number(form.equity),
        form.stage
      );
      setDeals(prev => [deal, ...prev]);
      setShowAddForm(false);
      setForm({ entrepreneurId: '', amount: '', equity: '', stage: 'Seed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Deals</h1>
          <p className="text-gray-600">Track and manage your investment pipeline</p>
        </div>

        {user?.role === 'investor' && (
          <Button onClick={() => setShowAddForm(true)}>Add Deal</Button>
        )}
      </div>

      {/* Add Deal form */}
      {showAddForm && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">New Deal</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAddDeal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startup</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.entrepreneurId}
                  onChange={(e) => setForm({ ...form, entrepreneurId: e.target.value })}
                  required
                >
                  <option value="">Select a startup...</option>
                  {entrepreneurs.map(e => (
                    <option key={e.id} value={e.id}>{e.startupName || e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <Input
                label="Amount (USD)"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />

              <Input
                label="Equity (%)"
                type="number"
                value={form.equity}
                onChange={(e) => setForm({ ...form, equity: e.target.value })}
                required
              />

              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Deal'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Stats — computed from real deal data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-lg mr-3">
                <DollarSign size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Invested (Closed)</p>
                <p className="text-lg font-semibold text-gray-900">${stats.totalInvestment.toLocaleString()}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 rounded-lg mr-3">
                <TrendingUp size={20} className="text-secondary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Deals</p>
                <p className="text-lg font-semibold text-gray-900">{stats.activeDeals}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-lg mr-3">
                <Users size={20} className="text-accent-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Portfolio Companies</p>
                <p className="text-lg font-semibold text-gray-900">{stats.portfolioCompanies}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-success-100 rounded-lg mr-3">
                <Calendar size={20} className="text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Closed This Month</p>
                <p className="text-lg font-semibold text-gray-900">{stats.closedThisMonth}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Input
            placeholder="Search deals by startup name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={<Search size={18} />}
            fullWidth
          />
        </div>

        <div className="w-full md:w-1/3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(status => (
                <Badge
                  key={status}
                  variant={selectedStatus.includes(status) ? getStatusColor(status) : 'gray'}
                  className="cursor-pointer" 
                  onClick={() => toggleStatus(status)}>
                  {status}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deals table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">
            {user?.role === 'investor' ? 'Your Deals' : 'Deals on Your Startup'}
          </h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Loading...</p>
          ) : filteredDeals.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No deals yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDeals.map(deal => (
                    <tr key={deal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar src={deal.startup.logo} alt={deal.startup.name} size="sm" className="flex-shrink-0" />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{deal.startup.name}</div>
                            <div className="text-sm text-gray-500">{deal.startup.industry}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${deal.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.equity}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(deal.status)}>{deal.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{deal.stage}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(deal.lastActivity).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
