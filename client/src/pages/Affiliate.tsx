import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, ExternalLink, Users, TrendingUp, Zap, Target, Headphones, Camera } from "lucide-react";

export default function Affiliate() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-[#D8AC35]/20 dark:from-black dark:via-gray-900 dark:to-[#D8AC35]/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
        
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-6 text-gray-900 dark:text-white" style={{ fontFamily: "'Saira Condensed', sans-serif", fontStyle: 'italic', transform: 'skew(-5deg)' }}>
            BECOME A SHARP SHOT AFFILIATE.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
            It's not luck. It's leverage—earn 51% recurring revenue by sharing tools built for sharps.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a 
              href="https://representatives.sharp-shot.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
              data-testid="button-apply-now"
            >
              <button className="flex items-center gap-2 py-4 px-8 rounded-full bg-gradient-to-r from-[#D8AC35]/80 to-[#D8AC35]/60 text-white border-2 border-[#D8AC35]/60 hover:from-[#D8AC35]/90 hover:to-[#D8AC35]/70 hover:border-[#D8AC35]/80 hover:shadow-lg hover:shadow-[#D8AC35]/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#D8AC35]/20 font-bold text-base relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                <span className="relative z-10">Apply Now</span>
                <ExternalLink className="w-4 h-4 relative z-10" />
              </button>
            </a>
            
            <a 
              href="https://representatives.sharp-shot.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
              data-testid="button-affiliate-portal"
            >
              <button className="flex items-center gap-2 py-4 px-8 rounded-full bg-transparent text-gray-900 dark:text-white border-2 border-gray-300/60 dark:border-gray-600/60 hover:border-[#D8AC35]/60 hover:text-[#D8AC35] transition-all duration-300 font-bold text-base relative overflow-hidden">
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D8AC35] group-hover:w-full transition-all duration-300"></span>
                <span className="relative z-10">Affiliate Portal Login</span>
                <ExternalLink className="w-4 h-4 relative z-10" />
              </button>
            </a>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="text-3xl font-bold text-[#D8AC35] mb-2">51%</div>
              <div className="text-gray-900 dark:text-white font-semibold">Recurring Commission</div>
            </div>
            <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="text-3xl font-bold text-[#D8AC35] mb-2"><Target className="w-8 h-8" /></div>
              <div className="text-gray-900 dark:text-white font-semibold">Creator-friendly assets and tracking</div>
            </div>
            <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="text-3xl font-bold text-[#D8AC35] mb-2"><TrendingUp className="w-8 h-8" /></div>
              <div className="text-gray-900 dark:text-white font-semibold">Transparent dashboards and support</div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AC35]/10 border border-[#D8AC35]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#D8AC35]"></div>
              <span className="text-sm font-semibold text-[#D8AC35] uppercase tracking-[0.2em]">Process</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white mb-6 uppercase tracking-[0.05em]" style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 900, fontStyle: 'italic', transform: 'skew(-5deg)' }}>
              HOW IT WORKS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 max-w-[1600px] mx-auto">
            {/* Step 1 */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-8 py-7">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#D8AC35]/10 dark:bg-[#D8AC35]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#D8AC35]/20 dark:border-[#D8AC35]/30">
                  <span className="text-[#D8AC35] font-bold text-lg">1</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Apply & get your link.</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Click Apply Now to register through our partner platform and receive your unique referral link.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-8 py-7">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#D8AC35]/10 dark:bg-[#D8AC35]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#D8AC35]/20 dark:border-[#D8AC35]/30">
                  <span className="text-[#D8AC35] font-bold text-lg">2</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Share what you actually use.</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Publish tutorials, presets, or reviews. We provide ready-to-ship assets.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-8 py-7">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-[#D8AC35]/10 dark:bg-[#D8AC35]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#D8AC35]/20 dark:border-[#D8AC35]/30">
                  <span className="text-[#D8AC35] font-bold text-lg">3</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Earn monthly, automatically.</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Every paying subscriber you bring in earns you 51% recurring commission.
              </p>
            </div>
          </div>
        </div>

        {/* Affiliate Benefits */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AC35]/10 border border-[#D8AC35]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#D8AC35]"></div>
              <span className="text-sm font-semibold text-[#D8AC35] uppercase tracking-[0.2em]">Benefits</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white mb-6 uppercase tracking-[0.05em]" style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 900, fontStyle: 'italic', transform: 'skew(-5deg)' }}>
              WHY SHARP SHOT AFFILIATES WIN
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
            {[
              { icon: <TrendingUp className="w-6 h-6" />, title: "Highest payouts—51% recurring" },
              { icon: <Target className="w-6 h-6" />, title: "Fast tracking and transparent dashboards" },
              { icon: <Zap className="w-6 h-6" />, title: "Preset sharing that converts followers" },
              { icon: <Headphones className="w-6 h-6" />, title: "Responsive creator-first support" },
              { icon: <Camera className="w-6 h-6" />, title: "Campaign assets ready on day one" },
              { icon: <Users className="w-6 h-6" />, title: "Featured placements for top performers" }
            ].map((benefit, index) => (
              <div key={index} className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#D8AC35]/10 dark:bg-[#D8AC35]/20 rounded-full flex items-center justify-center border border-[#D8AC35]/20 dark:border-[#D8AC35]/30">
                    <div className="text-[#D8AC35]">{benefit.icon}</div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">{benefit.title}</h3>
              </div>
            ))}
          </div>
        </div>

        {/* Creator Resources */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AC35]/10 border border-[#D8AC35]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#D8AC35]"></div>
              <span className="text-sm font-semibold text-[#D8AC35] uppercase tracking-[0.2em]">Resources</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white mb-6 uppercase tracking-[0.05em]" style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 900, fontStyle: 'italic', transform: 'skew(-5deg)' }}>
              WE HAND YOU WHAT PERFORMS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 max-w-[1200px] mx-auto">
            {[
              { title: "Template videos and b-roll", icon: <Camera className="w-6 h-6" /> },
              { title: "Preset screenshots and overlays", icon: <Target className="w-6 h-6" /> },
              { title: "Talking points and disclaimers", icon: <Users className="w-6 h-6" /> },
              { title: "Brand kit: logo, colors, typography", icon: <Zap className="w-6 h-6" /> }
            ].map((resource, index) => (
              <div key={index} className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#D8AC35]/10 dark:bg-[#D8AC35]/20 rounded-full flex items-center justify-center border border-[#D8AC35]/20 dark:border-[#D8AC35]/30">
                    <div className="text-[#D8AC35]">{resource.icon}</div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{resource.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community & Recognition */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AC35]/10 border border-[#D8AC35]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#D8AC35]"></div>
              <span className="text-sm font-semibold text-[#D8AC35] uppercase tracking-[0.2em]">Community</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white mb-6 uppercase tracking-[0.05em]" style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 900, fontStyle: 'italic', transform: 'skew(-5deg)' }}>
              JOIN A GROWING COMMUNITY
            </h2>
          </div>

          <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-8 max-w-[1200px] mx-auto">
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Affiliates aren't just partners—they're part of the Sharp Shot ecosystem. We spotlight top creators in:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-[#D8AC35]/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-[#D8AC35] stroke-[3]" />
                </div>
                <span className="text-gray-900 dark:text-white">Community Highlights on our platform</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-[#D8AC35]/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-[#D8AC35] stroke-[3]" />
                </div>
                <span className="text-gray-900 dark:text-white">Dedicated Discord channels for strategy and feedback</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-[#D8AC35]/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-[#D8AC35] stroke-[3]" />
                </div>
                <span className="text-gray-900 dark:text-white">Co-marketing opportunities with Sharp Shot</span>
              </div>
            </div>

            {/* Placeholder visuals */}
            <div className="flex justify-center gap-4">
              <div className="bg-[#5865F2]/10 dark:bg-[#5865F2]/20 border border-[#5865F2]/20 dark:border-[#5865F2]/30 px-4 py-2 rounded-full">
                <span className="text-[#5865F2] font-semibold text-sm">Discord Community</span>
              </div>
              <div className="bg-[#D8AC35]/10 dark:bg-[#D8AC35]/20 border border-[#D8AC35]/20 dark:border-[#D8AC35]/30 px-4 py-2 rounded-full">
                <span className="text-[#D8AC35] font-semibold text-sm">Featured Creator</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AC35]/10 border border-[#D8AC35]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#D8AC35]"></div>
              <span className="text-sm font-semibold text-[#D8AC35] uppercase tracking-[0.2em]">Support</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white mb-6 uppercase tracking-[0.05em]" style={{ fontFamily: "'Saira Condensed', sans-serif", fontWeight: 900, fontStyle: 'italic', transform: 'skew(-5deg)' }}>
              FREQUENTLY ASKED QUESTIONS
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-6">
                <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#D8AC35] hover:no-underline">
                  Who can apply?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Any content creator, educator, or sports betting enthusiast who creates authentic content about betting strategy and tools. We welcome YouTubers, streamers, newsletter writers, and community builders.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-6">
                <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#D8AC35] hover:no-underline">
                  How are commissions tracked?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Our partner platform provides real-time tracking with detailed analytics. You'll see clicks, conversions, and earnings in your dashboard, updated continuously.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-6">
                <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#D8AC35] hover:no-underline">
                  When are payouts made?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Payouts are processed monthly on the 15th for all commissions earned in the previous month, with a minimum payout threshold of $50.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-6">
                <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#D8AC35] hover:no-underline">
                  Can affiliates share presets?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Yes! Sharing your Sharp Shot presets is one of the most effective ways to demonstrate value. We provide templates and guidance for showcasing preset performance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-6">
                <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#D8AC35] hover:no-underline">
                  Are there content guidelines?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  We require honest, educational content that accurately represents Sharp Shot's capabilities. No guarantees, no get-rich-quick claims, and always include proper disclaimers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 px-6">
                <AccordionTrigger className="text-lg font-semibold text-gray-900 dark:text-white hover:text-[#D8AC35] hover:no-underline">
                  Is this gambling advice?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  No. Sharp Shot is a mathematical tool for analyzing sports betting markets. All content should be educational and include appropriate disclaimers about responsible gambling.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Compliance Footer */}
        <div className="mb-12">
          <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6 max-w-4xl mx-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              For informational and educational purposes. Not gambling advice. Must be of legal age where you wager. Check local laws. Terms apply. 
              <a href="/support" className="text-[#D8AC35] hover:underline ml-2">Support</a> | 
              <a href="mailto:support@sharpshotcalc.com" className="text-[#D8AC35] hover:underline ml-2">support@sharpshotcalc.com</a>
            </p>
          </div>
        </div>

        {/* Final CTA Band */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-[#D8AC35]/10 to-[#D8AC35]/5 dark:from-[#D8AC35]/15 dark:to-[#D8AC35]/10 rounded-2xl border border-[#D8AC35]/20 p-12">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to turn transparency into recurring revenue?
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a 
                href="https://representatives.sharp-shot.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="group"
                data-testid="button-apply-now-final"
              >
                <button className="flex items-center gap-2 py-4 px-8 rounded-full bg-gradient-to-r from-[#D8AC35]/80 to-[#D8AC35]/60 text-white border-2 border-[#D8AC35]/60 hover:from-[#D8AC35]/90 hover:to-[#D8AC35]/70 hover:border-[#D8AC35]/80 hover:shadow-lg hover:shadow-[#D8AC35]/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#D8AC35]/20 font-bold text-base relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out"></div>
                  <span className="relative z-10">Apply Now</span>
                  <ExternalLink className="w-4 h-4 relative z-10" />
                </button>
              </a>
              
              <a href="/support" className="group" data-testid="button-talk-to-team">
                <button className="flex items-center gap-2 py-4 px-8 rounded-full bg-transparent text-gray-900 dark:text-white border-2 border-gray-300/60 dark:border-gray-600/60 hover:border-[#D8AC35]/60 hover:text-[#D8AC35] transition-all duration-300 font-bold text-base relative overflow-hidden">
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#D8AC35] group-hover:w-full transition-all duration-300"></span>
                  <span className="relative z-10">Talk to Our Team</span>
                </button>
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}