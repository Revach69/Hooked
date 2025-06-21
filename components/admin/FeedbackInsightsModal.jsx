import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EventFeedback } from '@/api/entities';
import { X, MessageSquare, Star, Users, CheckCircle, XCircle } from 'lucide-react';

export default function FeedbackInsightsModal({ event, isOpen, onClose }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen && event) {
      loadFeedbacks();
    }
  }, [isOpen, event]);

  const loadFeedbacks = async () => {
    setIsLoading(true);
    try {
      const feedbackList = await EventFeedback.filter({ event_id: event.id });
      setFeedbacks(feedbackList);
      calculateStats(feedbackList);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (feedbackList) => {
    if (feedbackList.length === 0) {
      setStats(null);
      return;
    }

    const totalCount = feedbackList.length;
    
    // Calculate averages for rating questions
    const profileSetupAvg = feedbackList.reduce((sum, f) => sum + f.rating_profile_setup, 0) / totalCount;
    const interestsHelpfulAvg = feedbackList.reduce((sum, f) => sum + f.rating_interests_helpful, 0) / totalCount;
    const socialUsefulnessAvg = feedbackList.reduce((sum, f) => sum + f.rating_social_usefulness, 0) / totalCount;
    
    // Calculate yes/no counts
    const metInPersonYes = feedbackList.filter(f => f.met_match_in_person).length;
    const metInPersonNo = totalCount - metInPersonYes;
    const openToOtherEventsYes = feedbackList.filter(f => f.open_to_other_event_types).length;
    const openToOtherEventsNo = totalCount - openToOtherEventsYes;

    setStats({
      totalResponses: totalCount,
      ratings: {
        profileSetup: { average: profileSetupAvg.toFixed(1), count: totalCount },
        interestsHelpful: { average: interestsHelpfulAvg.toFixed(1), count: totalCount },
        socialUsefulness: { average: socialUsefulnessAvg.toFixed(1), count: totalCount }
      },
      booleans: {
        metInPerson: { yes: metInPersonYes, no: metInPersonNo },
        openToOtherEvents: { yes: openToOtherEventsYes, no: openToOtherEventsNo }
      }
    });
  };

  const StarDisplay = ({ rating }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= Math.round(rating) 
              ? 'text-yellow-500 fill-current' 
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
      <span className="ml-2 font-semibold text-gray-900 dark:text-white">{rating}</span>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 bg-black/80 dark:bg-black/90 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
          <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    Feedback Insights
                  </DialogTitle>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {event?.name}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : feedbacks.length === 0 ? (
              <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No feedback responses yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Feedback will appear here after the event ends and participants submit their responses.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary Stats */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <Users className="w-5 h-5" />
                      Summary ({stats?.totalResponses} responses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Profile Setup</h4>
                        <StarDisplay rating={parseFloat(stats?.ratings.profileSetup.average)} />
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Interests Helpful</h4>
                        <StarDisplay rating={parseFloat(stats?.ratings.interestsHelpful.average)} />
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Social Interaction</h4>
                        <StarDisplay rating={parseFloat(stats?.ratings.socialUsefulness.average)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Yes/No Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white text-base">Met Match in Person</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-gray-900 dark:text-white">Yes</span>
                        </div>
                        <Badge variant="outline" className="border-green-200 dark:border-green-700 text-green-600 dark:text-green-400">
                          {stats?.booleans.metInPerson.yes}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-gray-900 dark:text-white">No</span>
                        </div>
                        <Badge variant="outline" className="border-red-200 dark:border-red-700 text-red-600 dark:text-red-400">
                          {stats?.booleans.metInPerson.no}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white text-base">Open to Other Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-gray-900 dark:text-white">Yes</span>
                        </div>
                        <Badge variant="outline" className="border-green-200 dark:border-green-700 text-green-600 dark:text-green-400">
                          {stats?.booleans.openToOtherEvents.yes}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-gray-900 dark:text-white">No</span>
                        </div>
                        <Badge variant="outline" className="border-red-200 dark:border-red-700 text-red-600 dark:text-red-400">
                          {stats?.booleans.openToOtherEvents.no}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Feedback */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Detailed Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 dark:border-gray-600">
                            <TableHead className="text-gray-900 dark:text-white">What to Improve</TableHead>
                            <TableHead className="text-gray-900 dark:text-white">General Feedback</TableHead>
                            <TableHead className="text-gray-900 dark:text-white">Ratings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {feedbacks.map((feedback, index) => (
                            <TableRow key={index} className="border-gray-200 dark:border-gray-600">
                              <TableCell className="text-gray-900 dark:text-white max-w-xs">
                                <div className="truncate" title={feedback.match_experience_feedback}>
                                  {feedback.match_experience_feedback}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-900 dark:text-white max-w-xs">
                                <div className="truncate" title={feedback.general_feedback || 'N/A'}>
                                  {feedback.general_feedback || 'N/A'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Profile: {feedback.rating_profile_setup}/5
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Interests: {feedback.rating_interests_helpful}/5
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Social: {feedback.rating_social_usefulness}/5
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}