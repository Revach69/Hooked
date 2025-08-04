
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/api/entities";
import { EventProfile } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UploadFile } from "@/api/integrations";
import { User as UserIcon, Edit, Save, Trash2, Eye, EyeOff, X, Camera, Sparkles, LogOut, AlertCircle, Clock, Mail, CheckCircle2, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import ReportModal from "@/components/ReportModal";


const ALL_INTERESTS = [
  "music", "tech", "food", "books", "travel", "art", "fitness", "nature",
  "movies", "business", "photography", "dancing", "yoga", "gaming", "comedy",
  "startups", "fashion", "spirituality", "volunteering", "crypto", "cocktails",
  "politics", "hiking", "design", "podcasts", "pets", "wellness"
];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [eventProfile, setEventProfile] = useState(null);
  const [isEditing, setIsEditing] = useState({
    bio: false,
    interests: false,
    height: false,
  });
  const [formData, setFormData] = useState({
    bio: "",
    interests: [],
    height: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      if (!currentUser) {
          navigate(createPageUrl("Home"));
          return;
      }
      setUser(currentUser);
      setFormData({
        bio: currentUser.bio || "",
        interests: currentUser.interests || [],
        height: currentUser.height || "",
      });

      const eventId = localStorage.getItem('currentEventId');
      const sessionId = localStorage.getItem('currentSessionId');
      if (eventId && sessionId) {
        const profiles = await EventProfile.filter({
          event_id: eventId,
          session_id: sessionId,
        });
        if (profiles.length > 0) {
          setEventProfile(profiles[0]);
        }
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
      toast.error("Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditToggle = (field) => {
    setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];

      if (newInterests.length > 3) {
        toast.warning("You can select up to 3 interests.");
        return prev;
      }
      return { ...prev, interests: newInterests };
    });
  };

  const handleSave = async (field) => {
    try {
      await User.updateMyUserData({ [field]: formData[field] });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated!`);
      handleEditToggle(field);
      await loadData();
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}.`);
    }
  };

  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      try {
        const { file_url } = await UploadFile({ file });
        await User.updateMyUserData({ profile_photo_url: file_url });
        toast.success("Profile photo updated!");
        await loadData();
      } catch (error) {
        console.error("Error uploading photo:", error);
        toast.error("Failed to upload photo.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const toggleVisibility = async () => {
    if (!eventProfile) return;
    try {
      const newVisibility = !eventProfile.is_visible;
      await EventProfile.update(eventProfile.id, { is_visible: newVisibility });
      setEventProfile(prev => ({ ...prev, is_visible: newVisibility }));
      toast.success(`Profile is now ${newVisibility ? 'visible' : 'hidden'}.`);
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error("Failed to update visibility.");
    }
  };

  const leaveEvent = async () => {
    if (!eventProfile || !confirm("Are you sure you want to leave this event? This will delete your profile for this event and cannot be undone.")) {
      return;
    }
    try {
      await EventProfile.delete(eventProfile.id);
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentEventCode');
      localStorage.removeItem('currentProfileColor');
      localStorage.removeItem('currentProfilePhotoUrl');
      toast.success("You have left the event.");
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error leaving event:", error);
      toast.error("Failed to leave event.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <style>{`
        .visibility-switch[data-state='checked'] {
          background-color: #34D399;
        }
        .visibility-switch[data-state='unchecked'] {
          background-color: #E5E7EB;
        }
        .dark .visibility-switch[data-state='unchecked'] {
          background-color: #4B5563;
        }
        .visibility-switch span {
          background-color: white !important;
        }
      `}</style>
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <label htmlFor="profile-photo-upload" className="cursor-pointer group">
              {user.profile_photo_url ? (
                <img src={user.profile_photo_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white font-semibold text-4xl" style={{ backgroundColor: user.profile_color }}>
                  {user.full_name ? user.full_name[0] : '?'}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </label>
            <input
              id="profile-photo-upload"
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoChange}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div></div>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.full_name}</h1>
          <p className="text-gray-500 dark:text-gray-400">{user.age} years old</p>
        </div>

        {/* Bio Section */}
        <Card className="border-0 shadow-lg mb-6 bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-gray-900 dark:text-white">About Me</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEditToggle('bio')} className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
              {isEditing.bio ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing.bio ? (
              <div className="space-y-4">
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({...prev, bio: e.target.value}))}
                  placeholder="Tell us a little about yourself..."
                  className="h-24 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <Button
                  onClick={() => handleSave('bio')}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-2"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Bio
                </Button>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">{user.bio || "No bio yet. Add one!"}</p>
            )}
          </CardContent>
        </Card>

        {/* Interests Section */}
        <Card className="border-0 shadow-lg mb-6 bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-gray-900 dark:text-white">Interests</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEditToggle('interests')} className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
              {isEditing.interests ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing.interests ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {ALL_INTERESTS.map(interest => (
                    <Badge
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      className={`cursor-pointer px-3 py-2 rounded-full transition-all ${
                        formData.interests.includes(interest)
                          ? 'interest-chip-selected bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                          : 'interest-chip-default border-2 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-400 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formData.interests.length} / 3 selected</p>
                <Button
                  onClick={() => handleSave('interests')}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-2"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Interests
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.interests?.map(interest => (
                  <Badge key={interest} className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    {interest}
                  </Badge>
                )) || <p className="text-gray-500 dark:text-gray-400">No interests added yet.</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Height Section */}
        <Card className="border-0 shadow-lg mb-6 bg-white dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-gray-900 dark:text-white">Height</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleEditToggle('height')} className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100">
              {isEditing.height ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            {isEditing.height ? (
              <div className="space-y-4">
                <Input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData(prev => ({...prev, height: e.target.value}))}
                  placeholder="Height in cm"
                  className="w-full height-input bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <Button
                  onClick={() => handleSave('height')}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-2"
                >
                  <Save className="w-4 h-4 mr-2" /> Save Height
                </Button>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">{user.height ? `${user.height} cm` : "Not specified"}</p>
            )}
          </CardContent>
        </Card>

        {/* Event-Specific Controls */}
        {eventProfile && (
          <>
            <Card className="border-0 shadow-lg mb-6 bg-white dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
                  {eventProfile.is_visible ? <Eye className="w-5 h-5 text-green-500" /> : <EyeOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                  Event Visibility
                </CardTitle>
                <Switch
                  checked={eventProfile.is_visible}
                  onCheckedChange={toggleVisibility}
                  className="visibility-switch"
                />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {eventProfile.is_visible
                    ? "Your profile is visible to others at the current event."
                    : "You are currently hidden from other attendees."}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg border-red-100 dark:border-red-900/20 bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-red-600 dark:text-red-400">
                  <LogOut className="w-5 h-5" />
                  Leave Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Permanently remove your profile from this event. This action cannot be undone.
                </p>
                <Button onClick={leaveEvent} variant="destructive" className="w-full h-auto whitespace-normal">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Leave Event & Delete Event Profile
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Safety & Reporting */}
        <Card className="border-0 shadow-lg mb-6 mt-8 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Safety & Reporting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              If you encounter inappropriate behavior, you can report users to event moderators.
            </p>
            <Button
              variant="outline"
              className="w-full border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 bg-white dark:bg-gray-800"
              onClick={() => setShowReportModal(true)}
            >
              Report a User
            </Button>
          </CardContent>
        </Card>

        {/* Automatic Data Expiration */}
        <Card className="border-0 shadow-lg mb-6 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
              <Clock className="w-5 h-5 text-blue-500" />
              Automatic Data Expiration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your profile, matches, and chat messages will be automatically deleted when this event ends. No data is stored permanently.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Profile expires automatically</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Matches and messages are deleted</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">No permanent account created</span>
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-around">
            <button
              className="flex flex-col items-center gap-1 py-2 px-4 text-purple-600 dark:text-purple-400"
            >
              <UserIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Profile</span>
            </button>
            <button
              onClick={() => navigate(createPageUrl("Discovery"))}
              className="flex flex-col items-center gap-1 py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">Discover</span>
            </button>
            <button
              onClick={() => navigate(createPageUrl("Matches"))}
              className="flex flex-col items-center gap-1 py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs">Matches</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        currentEventId={localStorage.getItem('currentEventId')}
        currentSessionId={localStorage.getItem('currentSessionId')}
      />
    </div>
  );
}
