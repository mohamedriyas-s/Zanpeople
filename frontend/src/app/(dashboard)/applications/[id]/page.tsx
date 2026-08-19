'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { CandidateApplication, StageProgress, Employee, ApiResponse, PaginatedResponse } from '@/types';
import {
  ArrowLeft, User, Briefcase, CheckCircle2, Clock, XCircle, PlayCircle, Loader2,
  Calendar, FileText, MessageSquare, Star, Video, ClipboardList, ChevronRight,
  AlertTriangle, Send, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApplicationPipelinePage() {
  const params = useParams();
  const router = useRouter();
  const [app, setApp] = useState<CandidateApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Task Assignment
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskScore, setTaskScore] = useState(0);
  const [taskEvalRemarks, setTaskEvalRemarks] = useState('');

  // Interview Scheduling
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [interviewerId, setInterviewerId] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewDuration, setInterviewDuration] = useState(60);
  const [meetingLink, setMeetingLink] = useState('');
  const [intRating, setIntRating] = useState(0);
  const [intRemarks, setIntRemarks] = useState('');
  const [intRecommendation, setIntRecommendation] = useState('');

  // Confirm reject
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  useEffect(() => { fetchApplication(); }, [params.id]);

  const fetchApplication = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get<ApiResponse<CandidateApplication>>(`/applications/${params.id}`);
      setApp(data.data);
    } catch {
      toast.error('Failed to load application');
      router.push('/jobs');
    } finally { setIsLoading(false); }
  };

  const fetchEmployees = async () => {
    if (employees.length > 0) return;
    try {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees?limit=100');
      setEmployees(data.data.items);
    } catch { }
  };

  const handleAdvance = async () => {
    try {
      setActionLoading(true);
      await api.post(`/applications/${params.id}/advance`, { remarks: remarks || null });
      toast.success('Candidate advanced successfully');
      setRemarks('');
      fetchApplication();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to advance');
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      await api.post(`/applications/${params.id}/reject`, { remarks: remarks || null });
      toast.success('Candidate rejected');
      setRemarks('');
      setShowRejectConfirm(false);
      fetchApplication();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to reject');
    } finally { setActionLoading(false); }
  };

  const handleMarkAccepted = async () => {
    if (!app?.candidateId) return;
    try {
      setActionLoading(true);
      await api.patch(`/candidates/${app.candidateId}/status`, { status: 'ACCEPTED' });
      toast.success('Candidate marked as Accepted');
      fetchApplication();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to mark as accepted');
    } finally { setActionLoading(false); }
  };

  const handleAssignTask = async () => {
    if (!taskTitle.trim()) { toast.error('Task title is required'); return; }
    const sp = getCurrentStageProgress();
    if (!sp) return;
    try {
      setActionLoading(true);
      await api.post(`/applications/${app!.id}/stages/${sp.id}/task`, {
        title: taskTitle,
        description: taskDesc || null,
        deadline: taskDeadline ? new Date(taskDeadline).toISOString() : null,
      });
      toast.success('Task assigned successfully');
      setTaskTitle(''); setTaskDesc(''); setTaskDeadline('');
      fetchApplication();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to assign task');
    } finally { setActionLoading(false); }
  };

  const handleEvaluateTask = async () => {
    if (taskScore < 1 || taskScore > 5) { toast.error('Score must be 1-5'); return; }
    const sp = getCurrentStageProgress();
    if (!sp) return;
    try {
      setActionLoading(true);
      await api.put(`/applications/${app!.id}/stages/${sp.id}/task`, {
        score: taskScore,
        evaluatorRemarks: taskEvalRemarks || null,
      });
      toast.success('Task evaluated');
      setTaskScore(0); setTaskEvalRemarks('');
      fetchApplication();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to evaluate task');
    } finally { setActionLoading(false); }
  };

  const handleScheduleInterview = async () => {
    if (!interviewerId || !interviewDate) { toast.error('Interviewer and date are required'); return; }
    const sp = getCurrentStageProgress();
    if (!sp) return;
    try {
      setActionLoading(true);
      await api.post(`/applications/${app!.id}/stages/${sp.id}/interview`, {
        interviewerId,
        scheduledAt: new Date(interviewDate).toISOString(),
        durationMinutes: interviewDuration,
        meetingLink: meetingLink || null,
      });
      toast.success('Interview scheduled & emails sent');
      setInterviewerId(''); setInterviewDate(''); setMeetingLink('');
      fetchApplication();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to schedule interview');
    } finally { setActionLoading(false); }
  };

  const handleEvaluateInterview = async (intId: string) => {
    if (intRating < 1 || intRating > 5) { toast.error('Rating must be 1-5'); return; }
    if (!intRecommendation) { toast.error('Recommendation is required'); return; }
    try {
      setActionLoading(true);
      await api.put(`/applications/${app!.id}/stages/${getCurrentStageProgress()!.id}/interview/${intId}`, {
        rating: intRating,
        remarks: intRemarks || null,
        recommendation: intRecommendation,
      });
      toast.success('Interview evaluated');
      setIntRating(0); setIntRemarks(''); setIntRecommendation('');
      fetchApplication();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to evaluate interview');
    } finally { setActionLoading(false); }
  };

  const getCurrentStageProgress = (): StageProgress | null => {
    if (!app?.currentStageId || !app?.stageProgress) return null;
    return app.stageProgress.find(sp => sp.stageId === app.currentStageId) || null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!app) return null;

  const stages = app.jobOpening?.template?.stages || [];
  const currentStageIndex = stages.findIndex(s => s.id === app.currentStageId);
  const currentSP = getCurrentStageProgress();
  const isLastStage = currentStageIndex === stages.length - 1;

  // Star rating component
  const StarRating = ({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: string }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg transition-all ${n <= value
            ? 'bg-amber-100 text-amber-500 border border-amber-300' : 'bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:border-amber-300'
            }`}>
          <Star className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} mx-auto ${n <= value ? 'fill-current' : ''}`} />
        </button>
      ))}
    </div>
  );

  // Recommendation badge
  const RecBadge = ({ rec }: { rec: string }) => {
    const styles: Record<string, string> = {
      STRONG_YES: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      YES: 'bg-green-50 text-green-700 border-green-200',
      NEUTRAL: 'bg-gray-100 text-gray-600 border-gray-300',
      NO: 'bg-red-50 text-red-600 border-red-200',
      STRONG_NO: 'bg-red-100 text-red-700 border-red-300',
    };
    return <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${styles[rec] || styles.NEUTRAL}`}>{rec.replace(/_/g, ' ')}</span>;
  };

  // ─── Render Stage-Specific Action Panel ─────────────

  const renderStageActions = () => {
    if (app.status !== 'IN_PIPELINE' || !app.currentStage || !currentSP) return null;
    const stageType = app.currentStage.stageType;

    return (
      <div className="bg-[hsl(var(--card))] border-2 border-[hsl(var(--primary)/0.3)] rounded-xl shadow-sm overflow-hidden">
        {/* Stage Header */}
        <div className="bg-[hsl(var(--primary)/0.05)] px-5 py-3 border-b border-[hsl(var(--primary)/0.1)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center px-2 py-0.5 rounded bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-[10px] font-bold tracking-wider mb-1">CURRENT STAGE</div>
              <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">{app.currentStage.name}</h2>
            </div>
            <span className="text-xs text-[hsl(var(--muted-foreground))] bg-[hsl(var(--accent))] px-2 py-1 rounded-md font-medium">{stageType}</span>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* ── TASK Stage ── */}
          {stageType === 'TASK' && (
            <>
              {!currentSP.taskAssignment ? (
                // Assign Task Form
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ClipboardList className="w-4 h-4 text-[hsl(var(--primary))]" />
                    <h3 className="font-semibold text-sm text-[hsl(var(--foreground))]">Assign Task</h3>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Task Title *</label>
                    <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="e.g. Build a REST API" className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Description</label>
                    <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Task requirements and expectations..." className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth min-h-[80px]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Deadline</label>
                    <input type="datetime-local" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
                  </div>
                  <button onClick={handleAssignTask} disabled={actionLoading} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] w-full">
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Assign Task & Notify Candidate
                  </button>
                </div>
              ) : (
                // Task Assigned — show details and evaluate
                <div className="space-y-4">
                  <div className="p-4 bg-[hsl(var(--accent)/0.5)] rounded-lg border border-[hsl(var(--border))]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm text-[hsl(var(--foreground))]">{currentSP.taskAssignment.title}</h4>
                        {currentSP.taskAssignment.description && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{currentSP.taskAssignment.description}</p>
                        )}
                      </div>
                      {currentSP.taskAssignment.score && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">{currentSP.taskAssignment.score}/5</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-2">
                      {currentSP.taskAssignment.deadline && (
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> Deadline: {new Date(currentSP.taskAssignment.deadline).toLocaleDateString()}</span>
                      )}
                      {currentSP.taskAssignment.evaluatedAt && (
                        <span className="flex items-center text-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Evaluated</span>
                      )}
                    </div>
                  </div>

                  {!currentSP.taskAssignment.evaluatedAt && (
                    <div className="space-y-3 p-4 border border-[hsl(var(--border))] rounded-lg">
                      <h4 className="font-semibold text-sm text-[hsl(var(--foreground))]">Evaluate Task</h4>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">Score (1-5)</label>
                        <StarRating value={taskScore} onChange={setTaskScore} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Evaluator Remarks</label>
                        <textarea value={taskEvalRemarks} onChange={e => setTaskEvalRemarks(e.target.value)} placeholder="Feedback on the task submission..." className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth min-h-[60px]" />
                      </div>
                      <button onClick={handleEvaluateTask} disabled={actionLoading || taskScore < 1} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] w-full">
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Submit Evaluation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── INTERVIEW Stage ── */}
          {stageType === 'INTERVIEW' && (
            <div className="space-y-4">
              {/* Existing Interviews */}
              {(currentSP.interviews || []).length > 0 && (
                <div className="space-y-3">
                  {currentSP.interviews!.map(int => (
                    <div key={int.id} className="p-4 bg-[hsl(var(--accent)/0.5)] rounded-lg border border-[hsl(var(--border))]">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm text-[hsl(var(--foreground))]">
                            Interview with {int.interviewer?.fullName || 'Unknown'}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-1">
                            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(int.scheduledAt).toLocaleString()}</span>
                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {int.durationMinutes} min</span>
                            {int.meetingLink && (
                              <a href={int.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center text-[hsl(var(--primary))] hover:underline">
                                <Video className="w-3 h-3 mr-1" /> Join Link
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {int.rating && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">{int.rating}/5</span>}
                          {int.recommendation && <RecBadge rec={int.recommendation} />}
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${int.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : int.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {int.status}
                          </span>
                        </div>
                      </div>

                      {int.remarks && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 italic bg-[hsl(var(--card))] p-2 rounded border border-[hsl(var(--border))]">"{int.remarks}"</p>
                      )}

                      {/* Evaluate if SCHEDULED */}
                      {int.status === 'SCHEDULED' && (
                        <div className="mt-3 p-3 border border-[hsl(var(--border))] rounded-lg space-y-3 bg-[hsl(var(--card))]">
                          <h5 className="text-xs font-semibold text-[hsl(var(--foreground))]">Evaluate Interview</h5>
                          <div>
                            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Rating</label>
                            <StarRating value={intRating} onChange={setIntRating} size="sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Recommendation</label>
                            <select value={intRecommendation} onChange={e => setIntRecommendation(e.target.value)}
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth">
                              <option value="">Select...</option>
                              <option value="STRONG_YES">Strong Yes</option>
                              <option value="YES">Yes</option>
                              <option value="NEUTRAL">Neutral</option>
                              <option value="NO">No</option>
                              <option value="STRONG_NO">Strong No</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1">Remarks</label>
                            <textarea value={intRemarks} onChange={e => setIntRemarks(e.target.value)} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth min-h-[50px]" placeholder="Interview feedback..." />
                          </div>
                          <button onClick={() => handleEvaluateInterview(int.id)} disabled={actionLoading} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-xs font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] w-full">
                            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                            Submit Evaluation
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Schedule New Interview */}
              <div className="p-4 border border-dashed border-[hsl(var(--border))] rounded-lg space-y-3" onClick={() => fetchEmployees()}>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <h4 className="font-semibold text-sm text-[hsl(var(--foreground))]">Schedule Interview</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Interviewer *</label>
                    <select value={interviewerId} onChange={e => setInterviewerId(e.target.value)} onFocus={fetchEmployees} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth">
                      <option value="">Select employee...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.fullName} — {emp.designation.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Date & Time *</label>
                    <input type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Duration (min)</label>
                    <input type="number" value={interviewDuration} onChange={e => setInterviewDuration(parseInt(e.target.value) || 60)} min={15} className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Meeting Link</label>
                    <input value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
                  </div>
                </div>
                <button onClick={handleScheduleInterview} disabled={actionLoading} className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] w-full">
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                  Schedule & Notify Both Parties
                </button>
              </div>
            </div>
          )}

          {/* ── Generic stages (APPLICATION, SCREENING, EVALUATION, CUSTOM) ── */}
          {(stageType === 'APPLICATION' || stageType === 'SCREENING' || stageType === 'EVALUATION' || stageType === 'CUSTOM') && (
            <div>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                {stageType === 'SCREENING' && "Review candidate profile and resume, then advance or reject."}
                {stageType === 'EVALUATION' && "Review all previous stage results and make a final decision."}
                {stageType === 'APPLICATION' && "Review the incoming application and decide whether to proceed."}
                {stageType === 'CUSTOM' && "Complete this stage and provide your remarks."}
              </p>
            </div>
          )}

          {/* ── Remarks + Advance/Reject (shown for ALL stages) ── */}
          <div className="pt-4 border-t border-[hsl(var(--border))] space-y-3">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Stage Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional remarks for this stage..." className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth min-h-[70px]" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 bg-[hsl(var(--destructive)/0.1)] hover:bg-[hsl(var(--destructive)/0.2)] text-[hsl(var(--destructive))] font-semibold rounded-lg transition-colors flex items-center justify-center text-sm"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </button>
              <button
                onClick={handleAdvance}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] flex-1"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                {isLastStage ? 'Select Candidate ✓' : 'Advance to Next Stage'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── Final Status Display ──────────────────────────

  const renderFinalStatus = () => {
    if (app.status === 'IN_PIPELINE') return null;
    return (
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-8 text-center">
        {app.status === 'SELECTED' ? (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">Candidate Selected!</h3>
            <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm">This candidate has successfully completed the entire pipeline.</p>
            
            {app.candidate?.employee ? (
              <Link href={`/employees/${app.candidate.employee.id}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] mt-4">
                <Briefcase className="w-4 h-4" /> View Employee Profile
              </Link>
            ) : app.candidate?.status === 'ACCEPTED' ? (
              <Link href={`/employees/convert?candidateId=${app.candidateId}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] mt-4">Convert to Employee</Link>
            ) : (
              <button onClick={handleMarkAccepted} disabled={actionLoading}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] mt-4">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark as Accepted
              </button>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">Candidate Rejected</h3>
            <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm">This application has been closed.</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))] truncate">{app.candidate?.name}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border shrink-0 ${app.status === 'SELECTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              app.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.2)]'
              }`}>
              {app.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Applying for: <strong className="text-[hsl(var(--foreground))]">{app.jobOpening?.title}</strong></span>
            {app.jobOpening?.department && <span className="text-[hsl(var(--border))]">•</span>}
            {app.jobOpening?.department && <span>{app.jobOpening.department.name}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Left Column — Candidate Info + Pipeline Stepper */}
        <div className="lg:col-span-1 space-y-4">
          {/* Candidate Quick Info */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-[hsl(var(--primary))]" /> Candidate
            </h3>
            <div className="space-y-2.5 text-sm">
              <div>
                <span className="text-[hsl(var(--muted-foreground))] text-xs block">Email</span>
                <span className="font-medium text-[hsl(var(--foreground))] text-xs break-all">{app.candidate?.email}</span>
              </div>
              <div>
                <span className="text-[hsl(var(--muted-foreground))] text-xs block">Phone</span>
                <span className="font-medium text-[hsl(var(--foreground))] text-xs">{app.candidate?.phone}</span>
              </div>
              <Link href={`/candidates/${app.candidateId}`} className="text-[hsl(var(--primary))] hover:underline font-medium text-xs flex items-center mt-2">
                View Full Profile <ExternalLink className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>

          {/* Pipeline Stepper */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] mb-4">Pipeline Progress</h3>
            <div className="space-y-0">
              {stages.map((stage, index) => {
                const sp = app.stageProgress?.find(p => p.stageId === stage.id);
                const isCompleted = sp?.status === 'COMPLETED';
                const isCurrent = app.currentStageId === stage.id && app.status === 'IN_PIPELINE';
                const isFailed = sp?.decision === 'FAIL';

                return (
                  <div key={stage.id} className="flex relative">
                    {index < stages.length - 1 && (
                      <div className={`absolute top-6 bottom-0 left-[11px] w-[2px] -mb-0 ${isCompleted ? (isFailed ? 'bg-red-300' : 'bg-emerald-400') : 'bg-[hsl(var(--border))]'}`} />
                    )}
                    <div className="mr-3 relative z-10 bg-[hsl(var(--card))]">
                      {isCompleted ? (
                        isFailed ? <XCircle className="w-6 h-6 text-red-500" /> : <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--primary))] flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--border))]" />
                      )}
                    </div>
                    <div className={`pb-4 flex-1 ${isCurrent ? '' : isCompleted ? 'opacity-80' : 'opacity-40'}`}>
                      <p className={`font-semibold text-xs ${isCurrent ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'}`}>
                        {stage.name}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {stage.stageType}
                        {sp?.completedAt && ` · ${new Date(sp.completedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column — Actions + History */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stage Actions or Final Status */}
          {renderStageActions()}
          {renderFinalStatus()}

          {/* Stage History */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
            <h3 className="font-semibold text-[hsl(var(--foreground))] mb-4">Stage History</h3>
            <div className="space-y-4">
              {app.stageProgress?.filter(sp => sp.status === 'COMPLETED').reverse().map((sp) => (
                <div key={sp.id} className="p-4 bg-[hsl(var(--accent)/0.5)] border border-[hsl(var(--border))] rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-[hsl(var(--foreground))]">{sp.stage?.name}</h4>
                      <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {sp.movedBy?.name || 'System'}</span>
                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {sp.completedAt ? new Date(sp.completedAt).toLocaleString() : ''}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${sp.decision === 'PASS' ? 'bg-emerald-100 text-emerald-700' :
                      sp.decision === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{sp.decision}</span>
                  </div>

                  {sp.remarks && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] italic mt-2 p-2 bg-[hsl(var(--card))] rounded border border-[hsl(var(--border))]">"{sp.remarks}"</p>
                  )}

                  {/* Show task results */}
                  {sp.taskAssignment && (
                    <div className="mt-2 p-2 bg-[hsl(var(--card))] rounded border border-[hsl(var(--border))] text-xs">
                      <span className="font-semibold">Task:</span> {sp.taskAssignment.title}
                      {sp.taskAssignment.score && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">{sp.taskAssignment.score}/5</span>}
                    </div>
                  )}

                  {/* Show interview results */}
                  {sp.interviews && sp.interviews.length > 0 && sp.interviews.map(int => (
                    <div key={int.id} className="mt-2 p-2 bg-[hsl(var(--card))] rounded border border-[hsl(var(--border))] text-xs">
                      <span className="font-semibold">Interview:</span> {int.interviewer?.fullName}
                      {int.rating && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">{int.rating}/5</span>}
                      {int.recommendation && <span className="ml-1"><RecBadge rec={int.recommendation} /></span>}
                    </div>
                  ))}
                </div>
              ))}

              {app.stageProgress?.filter(sp => sp.status === 'COMPLETED').length === 0 && (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-4">No stages completed yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-[hsl(var(--foreground))]">Reject Candidate?</h3>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              This will reject <strong>{app.candidate?.name}</strong> from <strong>{app.jobOpening?.title}</strong>. This action cannot be easily undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRejectConfirm(false)} className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--accent))]">Cancel</button>
              <button onClick={handleReject} disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
