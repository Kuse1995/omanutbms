import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Heart, MapPin, Users, Loader2, Package, ArrowRight, ArrowLeft, CheckCircle, Droplets } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WashForum {
  id: string;
  name: string;
  province: string;
  community_size: number;
  description: string;
  products_needed: string;
  priority: string;
}

interface DonationModalProps {
  forum: WashForum | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const donationOptions = [
  { id: "personal-5", label: "5 Personal Water Filters", value: 5, product: "Personal Filter", impact: "5 families" },
  { id: "personal-10", label: "10 Personal Water Filters", value: 10, product: "Personal Filter", impact: "10 families" },
  { id: "family-1", label: "1 Family Water Filter", value: 1, product: "Family Filter", impact: "1 household (5-7 people)" },
  { id: "community-1", label: "1 Community Water Dispenser", value: 1, product: "Community Dispenser", impact: "100+ people daily" },
  { id: "custom", label: "Custom Donation", value: 0, product: "Custom", impact: "Discuss with our team" },
];

const donationSchema = z.object({
  donor_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  donor_email: z.string().email("Please enter a valid email address").max(255),
  donor_phone: z.string().max(20).optional(),
  message: z.string().max(500).optional(),
  donation_type: z.string().min(1, "Please select a donation option"),
  custom_amount: z.string().optional(),
});

type DonationFormData = z.infer<typeof donationSchema>;

export function DonationModal({ forum, open, onOpenChange }: DonationModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      donor_name: "",
      donor_email: "",
      donor_phone: "",
      message: "",
      donation_type: "",
      custom_amount: "",
    },
  });

  const selectedDonationType = form.watch("donation_type");
  const selectedOption = donationOptions.find(o => o.id === selectedDonationType);

  const handleClose = () => {
    setStep(1);
    setIsSuccess(false);
    form.reset();
    onOpenChange(false);
  };

  const handleNextStep = async () => {
    if (step === 1) {
      const isValid = await form.trigger("donation_type");
      if (isValid) setStep(2);
    } else if (step === 2) {
      const isValid = await form.trigger(["donor_name", "donor_email"]);
      if (isValid) setStep(3);
    }
  };

  const onSubmit = async (data: DonationFormData) => {
    if (!forum) return;

    setIsSubmitting(true);
    
    const donationDetails = selectedOption 
      ? `${selectedOption.label} (Impact: ${selectedOption.impact})`
      : `Custom: ${data.custom_amount}`;
    
    const fullMessage = `Donation Selection: ${donationDetails}\n\n${data.message || "No additional message"}`;

    const { error } = await supabase
      .from("donation_requests")
      .insert({
        wash_forum_id: forum.id,
        donor_name: data.donor_name,
        donor_email: data.donor_email,
        donor_phone: data.donor_phone || null,
        message: fullMessage,
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit donation request. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSuccess(true);
    setStep(4);
  };

  if (!forum) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Progress Indicator */}
        {!isSuccess && (
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            {step === 1 && "Select Your Donation"}
            {step === 2 && "Your Information"}
            {step === 3 && "Confirm Donation"}
            {step === 4 && "Thank You!"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Choose how you'd like to support " + forum.name}
            {step === 2 && "We'll use this to coordinate your donation"}
            {step === 3 && "Review and confirm your donation details"}
            {step === 4 && "Your donation request has been submitted"}
          </DialogDescription>
        </DialogHeader>

        {/* Forum Summary - Always visible */}
        {!isSuccess && (
          <div className="bg-secondary/50 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-foreground mb-2">{forum.name}</h4>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {forum.province} Province
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {forum.community_size.toLocaleString()} beneficiaries
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Products Needed: </span>
              <span className="text-muted-foreground">{forum.products_needed}</span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Step 1: Select Donation Type */}
            {step === 1 && (
              <FormField
                control={form.control}
                name="donation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="space-y-3"
                      >
                        {donationOptions.map((option) => (
                          <div key={option.id} className={`flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                            field.value === option.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}>
                            <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{option.label}</span>
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Droplets className="w-3 h-3 text-primary" />
                                <span className="text-sm text-muted-foreground">Impact: {option.impact}</span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {step === 1 && selectedDonationType === "custom" && (
              <FormField
                control={form.control}
                name="custom_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe Your Custom Donation</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., 20 Personal Filters, or a combination of products..."
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Step 2: Donor Information */}
            {step === 2 && (
              <>
                {/* Community Highlight Card */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        You're donating to <span className="text-primary font-semibold">{forum.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {forum.province} Province • {forum.community_size.toLocaleString()} beneficiaries
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="donor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="donor_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="donor_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+260 XXX XXX XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message to {forum.name} (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={`Share a personal message for ${forum.name}... e.g., "We're excited to support your community's access to clean water!"`}
                          className="resize-none"
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your message will be shared with the community along with your donation.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Donation Summary
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Community:</span>
                      <span className="font-medium text-foreground">{forum.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Donation:</span>
                      <span className="font-medium text-foreground">
                        {selectedOption?.label || "Custom"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impact:</span>
                      <span className="font-medium text-primary">
                        {selectedOption?.impact || form.getValues("custom_amount")}
                      </span>
                    </div>
                    <hr className="my-2 border-border" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Donor:</span>
                      <span className="font-medium text-foreground">{form.getValues("donor_name")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium text-foreground">{form.getValues("donor_email")}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>What happens next?</strong> Our team will contact you within 24-48 hours to:
                  </p>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    <li>• Confirm product availability and pricing</li>
                    <li>• Coordinate payment and logistics</li>
                    <li>• Schedule delivery to the WASH Forum</li>
                    <li>• Provide your Impact Certificate upon completion</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && isSuccess && (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Donation Request Submitted!</h3>
                <p className="text-muted-foreground mb-4">
                  Thank you for supporting <strong>{forum.name}</strong>. Our team will contact you at <strong>{form.getValues("donor_email")}</strong> within 24-48 hours.
                </p>
                <div className="bg-secondary/50 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-foreground mb-2">Your Donation:</p>
                  <p className="text-sm text-muted-foreground">{selectedOption?.label || form.getValues("custom_amount")}</p>
                  <p className="text-sm text-primary mt-1">Impact: {selectedOption?.impact || "Custom"}</p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-2">
              {step > 1 && step < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {step < 3 && (
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                  onClick={handleNextStep}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {step === 3 && (
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      Confirm Donation
                    </>
                  )}
                </Button>
              )}

              {step === 4 && (
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Close
                </Button>
              )}
            </div>
          </form>
        </Form>

        {step < 4 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Finch Investments coordinates all donations with verified WASH Forums.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
