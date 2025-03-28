import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

type ClauseReport = {
  id: string;
  user_id: string | null;
  clause_id: string;
  standard_id: string;
  issue_type: string;
  user_comment: string | null;
  reported_at: string;
  is_resolved: boolean;
  resolution_notes: string | null;
  resolved_at: string | null;
};

export default function ClauseReportsAdmin() {
  const [reports, setReports] = useState<ClauseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ClauseReport | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingReport, setResolvingReport] = useState(false);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    loadReports();
  }, []);
  
  const loadReports = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('clause_reports')
        .select('*')
        .order('reported_at', { ascending: false });
        
      if (error) throw error;
      
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load clause reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenResolveModal = (report: ClauseReport) => {
    setSelectedReport(report);
    setResolutionNotes(report.resolution_notes || '');
    setIsResolveModalOpen(true);
  };
  
  const handleResolveReport = async () => {
    if (!selectedReport) return;
    
    setResolvingReport(true);
    
    try {
      const { error } = await supabase
        .from('clause_reports')
        .update({
          is_resolved: true,
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Report marked as resolved",
        variant: "default"
      });
      
      // Update the local state
      setReports(reports.map(report => 
        report.id === selectedReport.id 
          ? { 
              ...report, 
              is_resolved: true, 
              resolution_notes: resolutionNotes,
              resolved_at: new Date().toISOString()
            } 
          : report
      ));
      
      setIsResolveModalOpen(false);
    } catch (error) {
      console.error('Error resolving report:', error);
      toast({
        title: "Error",
        description: "Failed to resolve report",
        variant: "destructive"
      });
    } finally {
      setResolvingReport(false);
    }
  };
  
  const formatIssueType = (issueType: string) => {
    switch (issueType) {
      case 'clause_doesnt_exist':
        return 'Clause doesn\'t exist';
      case 'incorrect_clause':
        return 'Incorrect clause content';
      case 'clause_not_loading':
        return 'Clause not loading';
      default:
        return issueType;
    }
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clause Reports</h1>
          <Button onClick={loadReports} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Clause Issue Reports</CardTitle>
            <CardDescription>
              View and manage reports of issues with clauses from users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>
                {reports.length === 0 ? 'No reports found' : `A list of all clause reports`}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported At</TableHead>
                  <TableHead>Clause</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      {new Date(report.reported_at).toLocaleDateString()} 
                      <span className="block text-xs text-gray-500">
                        {new Date(report.reported_at).toLocaleTimeString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{report.clause_id}</span>
                      <span className="block text-xs text-gray-500">
                        AS/NZS {report.standard_id}
                      </span>
                    </TableCell>
                    <TableCell>{formatIssueType(report.issue_type)}</TableCell>
                    <TableCell>
                      <Badge variant={report.is_resolved ? "outline" : "secondary"}>
                        {report.is_resolved ? 'Resolved' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {report.user_comment || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {!report.is_resolved && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenResolveModal(report)}
                        >
                          Resolve
                        </Button>
                      )}
                      {report.is_resolved && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenResolveModal(report)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.is_resolved ? 'Resolution Details' : 'Resolve Issue Report'}
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.is_resolved 
                ? 'View the resolution details for this report' 
                : 'Add notes about how this issue was resolved'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedReport && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Clause</h3>
                    <p>{selectedReport.clause_id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Standard</h3>
                    <p>AS/NZS {selectedReport.standard_id}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">Issue Type</h3>
                  <p>{formatIssueType(selectedReport.issue_type)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">User Comment</h3>
                  <p className="bg-gray-50 p-2 rounded text-sm">
                    {selectedReport.user_comment || 'No comment provided'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-1">Resolution Notes</h3>
                  {selectedReport.is_resolved ? (
                    <p className="bg-gray-50 p-2 rounded text-sm">
                      {selectedReport.resolution_notes || 'No resolution notes provided'}
                    </p>
                  ) : (
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Describe how this issue was resolved..."
                      className="min-h-[100px]"
                    />
                  )}
                </div>
                
                {selectedReport.is_resolved && selectedReport.resolved_at && (
                  <div>
                    <h3 className="text-sm font-medium mb-1">Resolved At</h3>
                    <p>
                      {new Date(selectedReport.resolved_at).toLocaleDateString()} 
                      {' '}
                      {new Date(selectedReport.resolved_at).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsResolveModalOpen(false)}
            >
              {selectedReport?.is_resolved ? 'Close' : 'Cancel'}
            </Button>
            
            {!selectedReport?.is_resolved && (
              <Button 
                onClick={handleResolveReport}
                disabled={resolvingReport}
              >
                {resolvingReport ? 'Saving...' : 'Mark as Resolved'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
} 