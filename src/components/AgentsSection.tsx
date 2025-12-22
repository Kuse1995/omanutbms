import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle, Users, TrendingUp, Award, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const zambianProvinces = [
  "Central Province",
  "Copperbelt Province",
  "Eastern Province",
  "Luapula Province",
  "Lusaka Province",
  "Muchinga Province",
  "Northern Province",
  "North-Western Province",
  "Southern Province",
  "Western Province",
];

const benefits = [
  {
    icon: TrendingUp,
    title: "Competitive Margins",
    description: "Attractive profit margins on all LifeStraw products",
  },
  {
    icon: Award,
    title: "Training & Support",
    description: "Comprehensive product training and ongoing support",
  },
  {
    icon: Users,
    title: "Marketing Materials",
    description: "Access to branded marketing and promotional materials",
  },
];

const AgentsSection = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    province: "",
    contactPerson: "",
    phoneNumber: "",
    businessType: "",
    motivation: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvinceChange = (value: string) => {
    setFormData((prev) => ({ ...prev, province: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("agent_applications").insert({
        business_name: formData.businessName,
        province: formData.province,
        contact_person: formData.contactPerson,
        phone_number: formData.phoneNumber,
        business_type: formData.businessType,
        motivation: formData.motivation,
      });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description:
          "Thank you for your interest. Our team will contact you within 3-5 business days.",
      });

      setFormData({
        businessName: "",
        province: "",
        contactPerson: "",
        phoneNumber: "",
        businessType: "",
        motivation: "",
      });
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-medium tracking-wider uppercase text-sm">
            Partner With Us
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mt-4 mb-6">
            Become a LifeStraw Agent
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join our network of trusted retailers bringing safe drinking water
            solutions to communities across Zambia.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          {/* Benefits Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="lg:col-span-1 space-y-6"
          >
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Why Partner With Us?
            </h3>
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">
                    {benefit.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}

            <Link 
              to="/agents/directory" 
              className="block p-6 rounded-lg border border-primary/30 bg-primary/5 mt-8 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h4 className="font-medium text-foreground">Find an Agent</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                View our directory of authorized agents across Zambia.
              </p>
            </Link>

            <div className="p-6 rounded-lg border border-border bg-secondary/20 mt-4">
              <h4 className="font-medium text-foreground mb-2">
                Have Questions?
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Contact our partnerships team for more information.
              </p>
              <p className="text-sm text-primary font-medium">
                agents@finchinvestments.co.zm
              </p>
            </div>
          </motion.div>

          {/* Application Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-card p-8 rounded-2xl shadow-lg border border-border"
            >
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Application Form
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Business Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="businessName"
                    className="text-sm font-medium text-foreground"
                  >
                    Business/Shop Name *
                  </label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Enter your business name"
                    required
                    className="bg-background"
                  />
                </div>

                {/* Province Dropdown */}
                <div className="space-y-2">
                  <label
                    htmlFor="province"
                    className="text-sm font-medium text-foreground"
                  >
                    Location/Province *
                  </label>
                  <Select
                    value={formData.province}
                    onValueChange={handleProvinceChange}
                    required
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border">
                      {zambianProvinces.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Person */}
                <div className="space-y-2">
                  <label
                    htmlFor="contactPerson"
                    className="text-sm font-medium text-foreground"
                  >
                    Contact Person *
                  </label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    placeholder="Full name"
                    required
                    className="bg-background"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label
                    htmlFor="phoneNumber"
                    className="text-sm font-medium text-foreground"
                  >
                    Phone Number *
                  </label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+260 XXX XXX XXX"
                    required
                    className="bg-background"
                  />
                </div>

                {/* Business Type */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="businessType"
                    className="text-sm font-medium text-foreground"
                  >
                    Type of Retail Business *
                  </label>
                  <Input
                    id="businessType"
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    placeholder="e.g., Pharmacy, Hardware Store, Supermarket, General Dealer"
                    required
                    className="bg-background"
                  />
                </div>

                {/* Motivation */}
                <div className="space-y-2 md:col-span-2">
                  <label
                    htmlFor="motivation"
                    className="text-sm font-medium text-foreground"
                  >
                    Why do you want to sell LifeStraw? *
                  </label>
                  <Textarea
                    id="motivation"
                    name="motivation"
                    value={formData.motivation}
                    onChange={handleInputChange}
                    placeholder="Tell us about your interest in partnering with LifeStraw..."
                    rows={4}
                    required
                    className="bg-background resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-8"
                >
                  {isSubmitting ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 animate-pulse" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AgentsSection;
