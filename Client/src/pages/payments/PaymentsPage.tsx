import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

type ActiveForm = 'deposit' | 'withdraw' | 'transfer' | null;

export const PaymentsPage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [connections, setConnections] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = () => {
    api.getTransactions().then(({ transactions, walletBalance }) => {
      setTransactions(transactions);
      setBalance(walletBalance);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadTransactions(); }, []);

  useEffect(() => {
    if (!user) return;
    const otherRole = user.role === 'investor' ? 'entrepreneur' : 'investor';
    api.listUsers(otherRole).then(({ users }) => setConnections(users));
  }, [user]);

  if (!user) return null;

  const resetForm = () => {
    setActiveForm(null);
    setAmount('');
    setRecipientId('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      let result: { transaction: any; walletBalance: number };
      if (activeForm === 'deposit') {
        result = await api.deposit(numAmount);
      } else if (activeForm === 'withdraw') {
        result = await api.withdraw(numAmount);
      } else if (activeForm === 'transfer') {
        if (!recipientId) {
          setError('Select a recipient');
          setSubmitting(false);
          return;
        }
        result = await api.transfer(recipientId, numAmount);
      } else {
        setSubmitting(false);
        return;
      }
      setBalance(result.walletBalance);
      setTransactions(prev => [result.transaction, ...prev]);
      resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'gray';
    }
  };

  const getTypeLabel = (txn: any) => {
    if (txn.type === 'deposit') return 'Deposit';
    if (txn.type === 'withdrawal') return 'Withdrawal';
    if (txn.type === 'transfer') {
      const isSender = txn.fromUser?.id === user.id;
      return isSender ? `Sent to ${txn.toUser?.name || 'user'}` : `Received from ${txn.fromUser?.name || 'user'}`;
    }
    return txn.type;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600">Sandbox wallet — simulated funds, no real money involved</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-3 rounded-md">
        This is a sandbox environment. All balances and transactions are simulated for demo purposes only — no real payment gateway (Stripe/PayPal) is connected and no real funds move.
      </div>

      {/* Wallet balance */}
      <Card className="bg-primary-600 text-black/70">
        <CardBody className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Wallet size={28} />
            </div>
            <div>
              <p className="text-black text-primary-100">Wallet Balance</p>
              <p className="text-3xl font-bold">${balance.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="bg-black/30 border-black/70 text-white hover:bg-black/40"
              leftIcon={<ArrowDownCircle size={18} />}
              onClick={() => setActiveForm('deposit')}
            >
              Deposit
            </Button>
            <Button
              variant="outline"
              className="bg-black/30 border-black/70 text-white hover:bg-black/30"
              leftIcon={<ArrowUpCircle size={18} />}
              onClick={() => setActiveForm('withdraw')}
            >
              Withdraw
            </Button>
            <Button
              variant="outline"
              className="bg-black/30 border-black/70 text-white hover:bg-black/40"
              leftIcon={<Send size={18} />}
              onClick={() => setActiveForm('transfer')}
            >
              Transfer
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Action form */}
      {activeForm && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 capitalize">{activeForm} Funds</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </CardHeader>
          <CardBody>
            {error && <div className="bg-error-50 text-error-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeForm === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Send to ({user.role === 'investor' ? 'Entrepreneur' : 'Investor'})
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    required
                  >
                    <option value="">Select...</option>
                    {connections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.startupName ? ` (${c.startupName})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Amount (USD)"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
              />

              <Button type="submit" disabled={submitting}>
                {submitting ? 'Processing...' : `Confirm ${activeForm}`}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{getTypeLabel(txn)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">${txn.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusColor(txn.status)}>{txn.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(txn.createdAt).toLocaleString()}
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
