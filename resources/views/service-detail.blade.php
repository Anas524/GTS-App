@extends('layouts.gts_app')

@section('title', $service['title'] . ' | GTS Logistics')

@section('content')

<main id="gtsServicesPage">

    <!-- Hero Section with Video Background -->
    <section id="servicesHero" class="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
        <!-- Video Background -->
        <div class="absolute inset-0 z-0">
            <video autoplay muted loop playsinline class="w-full h-full object-cover scale-110 animate-kenburns-slow">
                <source src="{{ $service['video'] }}" type="video/mp4">
            </video>
            <div class="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/90"></div>
        </div>

        <!-- Animated Particles Overlay -->
        <div class="absolute inset-0 z-0 opacity-30" id="particles"></div>

        <!-- Content -->
        <div class="relative z-10 text-center px-4 max-w-6xl mx-auto" data-aos="fade-up" data-aos-duration="1200">
            <div class="top-content inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white/90 text-sm font-medium mb-6 border border-white/20">
                <span class="w-2 h-2 bg-[#FDCA31] rounded-full animate-ping"></span>
                Global Logistics Solutions
            </div>

            <h1 class="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[0.95] tracking-tight">
                {{ $service['title'] }}
            </h1>

            <p class="text-base md:text-lg text-slate-200 max-w-3xl mx-auto font-normal leading-relaxed mb-10" data-aos="fade-up" data-aos-delay="200">
                {{ $service['description'] ?? $service['description'] }}
            </p>

            <div class="flex flex-col sm:flex-row gap-4 justify-center" data-aos="fade-up" data-aos-delay="400">
                <a href="#whyChooseUs" class="no-underline group px-8 py-4 bg-[#01569F] text-white rounded-full font-semibold hover:bg-[#FDCA31] transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#01569F]/40 flex items-center justify-center gap-2">
                    Explore
                    <svg class="w-5 h-5 transition-transform group-hover:translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                    </svg>
                </a>
                <a href="{{ url('/') }}?quote=1#contact-section" class="no-underline px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-full font-semibold hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    Get Quote
                </a>
            </div>
        </div>

        <!-- Scroll Indicator -->
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce-slow">
            <div class="w-8 h-12 border-2 border-white/30 rounded-full flex justify-center pt-2">
                <div class="w-1 h-3 bg-[#FDCA31] rounded-full animate-scroll-down"></div>
            </div>
        </div>
    </section>

    <!-- Floating Stats Bar -->
    <section class="relative z-20 -mt-24 px-4 mb-20">
        <div class="max-w-6xl mx-auto">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-3xl shadow-2xl shadow-slate-900/20 p-8 border border-slate-100 backdrop-blur-xl">
                <div class="text-center group" data-aos="fade-up" data-aos-delay="0">
                    <div class="text-4xl font-bold text-slate-900 mb-1 group-hover:text-[#01569F] transition-colors counter" data-target="150">0</div>
                    <div class="stats-bar text-slate-500 text-sm font-medium uppercase tracking-wider">Countries</div>
                </div>
                <div class="text-center group" data-aos="fade-up" data-aos-delay="100">
                    <div class="text-4xl font-bold text-slate-900 mb-1 group-hover:text-[#01569F] transition-colors counter" data-target="500">0</div>
                    <div class="stats-bar text-slate-500 text-sm font-medium uppercase tracking-wider">Shipments</div>
                </div>
                <div class="text-center group" data-aos="fade-up" data-aos-delay="200">
                    <div class="text-4xl font-bold text-slate-900 mb-1 group-hover:text-[#01569F] transition-colors counter" data-target="24">0</div>
                    <div class="stats-bar text-slate-500 text-sm font-medium uppercase tracking-wider">/7 Support</div>
                </div>
                <div class="text-center group" data-aos="fade-up" data-aos-delay="300">
                    <div class="text-4xl font-bold text-slate-900 mb-1 group-hover:text-[#01569F] transition-colors counter" data-target="99">0</div>
                    <div class="stats-bar text-slate-500 text-sm font-medium uppercase tracking-wider">% Satisfaction</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Why Choose Us -->
    <section class="pb-24 relative overflow-hidden" id="whyChooseUs">
        <div class="max-w-7xl mx-auto px-4">
            <div class="grid lg:grid-cols-2 gap-16 items-center">
                <div data-aos="fade-right">
                    <span class="text-[#01569F] font-semibold tracking-wider uppercase text-sm">Why GTS</span>
                    <h2 class="text-4xl md:text-5xl font-bold text-slate-900 mt-4 mb-6 leading-tight">
                        Technology-Driven <br>Logistics Excellence
                    </h2>
                    <p class="text-slate-600 text-lg mb-8 leading-relaxed">
                        We combine decades of industry expertise with cutting-edge technology to deliver seamless shipping experiences that keep your business moving.
                    </p>

                    <div class="space-y-6">

                        @foreach($service['why_choose'] as $item)

                        <div class="flex gap-4 group">

                            <div class="w-12 h-12
                            bg-[#01569F]/10
                            rounded-xl
                            flex
                            items-center
                            justify-center
                            flex-shrink-0
                            group-hover:bg-[#01569F]
                            transition-all
                            duration-300">

                                <i class="{{ $item['icon'] }}
                                text-[#01569F]
                                group-hover:text-white
                                transition-colors"></i>

                            </div>

                            <div>

                                <h3 class="text-xl
                                    font-bold
                                    text-slate-900
                                    mb-2">

                                    {{ $item['title'] }}

                                </h3>

                                <p class="text-slate-600">

                                    {{ $item['desc'] }}

                                </p>

                            </div>

                        </div>

                        @endforeach

                    </div>
                </div>

                <div class="relative" data-aos="fade-left">
                    <div class="relative rounded-3xl overflow-hidden shadow-2xl">
                        <img src="{{ asset($service['image']) }}">
                        <div class="absolute inset-0 bg-gradient-to-tr from-[#01569F] to-transparent"></div>
                    </div>

                    <!-- Floating Stats Card -->
                    <div class="absolute -bottom-8 -left-8 bg-white p-6 rounded-2xl shadow-2xl max-w-xs animate-float hidden md:block">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                                <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <div class="stats-card text-2xl font-bold text-slate-900">99.8%</div>
                                <div class="stats-card text-sm text-slate-500">Delivery Success Rate</div>
                            </div>
                        </div>
                    </div>

                    <!-- Decorative Elements -->
                    <div class="absolute -top-4 -right-4 w-24 h-24 bg-[#FDCA31]/30 rounded-full blur-2xl"></div>
                    <div class="absolute -bottom-4 -right-4 w-32 h-32 bg-[#01569F]/30 rounded-full blur-2xl"></div>
                </div>
            </div>
        </div>
    </section>

    <!-- Process Section with Parallax -->
    <section class="process-section relative py-32 overflow-hidden bg-slate-900">
        <!-- Parallax Background -->
        <div class="absolute inset-0 z-0">
            <div class="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605745341112-85968b19335b?w=1920&q=80')] bg-cover bg-center bg-fixed opacity-20"></div>
            <div class="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-900"></div>
        </div>

        <div class="max-w-7xl mx-auto px-4 relative z-10">
            <div class="text-center max-w-3xl mx-auto mb-20" data-aos="fade-up">
                <span class="text-[#FDCA31] font-semibold tracking-wider uppercase text-sm">How We Work</span>
                <h2 class="text-3xl md:text-5xl font-bold text-white mt-4 mb-6">Simple 4-Step Process</h2>
                <p class="text-slate-400 text-lg">Streamlined logistics from quote to delivery with complete transparency.</p>
            </div>

            <div class="grid md:grid-cols-4 gap-8 relative">
                <!-- Connecting Line -->
                <div class="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#01569F]/20 via-[#01569F]/10 to-[#FDCA31]/10 transform -translate-y-1/2 z-0"></div>

                <!-- Step 1 -->
                <div class="relative z-10 text-center group" data-aos="fade-up" data-aos-delay="0">
                    <div class="w-20 h-20 mx-auto bg-slate-800 border-2 border-[#01569F]/30 rounded-full flex items-center justify-center mb-6 group-hover:border-[#01569F] group-hover:scale-110 transition-all duration-500 relative">
                        <span class="text-3xl font-bold text-[#FDCA31]">1</span>
                        <div class="absolute inset-0 rounded-full bg-[#01569F]/20 animate-ping opacity-0 group-hover:opacity-100"></div>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Request Quote</h3>
                    <p class="text-slate-400 text-sm leading-relaxed">Share your shipment details and get instant competitive pricing.</p>
                </div>

                <!-- Step 2 -->
                <div class="relative z-10 text-center group" data-aos="fade-up" data-aos-delay="150">
                    <div class="w-20 h-20 mx-auto bg-slate-800 border-2 border-[#01569F]/30 rounded-full flex items-center justify-center mb-6 group-hover:border-[#01569F] group-hover:scale-110 transition-all duration-500 relative">
                        <span class="text-3xl font-bold text-[#FDCA31]">2</span>
                        <div class="absolute inset-0 rounded-full bg-[#01569F]/20 animate-ping opacity-0 group-hover:opacity-100"></div>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Book & Confirm</h3>
                    <p class="text-slate-400 text-sm leading-relaxed">Lock in your schedule with our easy booking confirmation system.</p>
                </div>

                <!-- Step 3 -->
                <div class="relative z-10 text-center group" data-aos="fade-up" data-aos-delay="300">
                    <div class="w-20 h-20 mx-auto bg-slate-800 border-2 border-[#01569F]/30 rounded-full flex items-center justify-center mb-6 group-hover:border-[#01569F] group-hover:scale-110 transition-all duration-500 relative">
                        <span class="text-3xl font-bold text-[#FDCA31]">3</span>
                        <div class="absolute inset-0 rounded-full bg-[#01569F]/20 animate-ping opacity-0 group-hover:opacity-100"></div>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Track Shipment</h3>
                    <p class="text-slate-400 text-sm leading-relaxed">Real-time tracking with updates at every milestone.</p>
                </div>

                <!-- Step 4 -->
                <div class="relative z-10 text-center group" data-aos="fade-up" data-aos-delay="450">
                    <div class="w-20 h-20 mx-auto bg-slate-800 border-2 border-[#01569F]/30 rounded-full flex items-center justify-center mb-6 group-hover:border-[#01569F] group-hover:scale-110 transition-all duration-500 relative">
                        <span class="text-3xl font-bold text-[#FDCA31]">4</span>
                        <div class="absolute inset-0 rounded-full bg-[#01569F]/20 animate-ping opacity-0 group-hover:opacity-100"></div>
                    </div>
                    <h3 class="text-xl font-bold text-white mb-3">Delivery</h3>
                    <p class="text-slate-400 text-sm leading-relaxed">Safe, on-time delivery with proof of completion.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- GTS CTA + MARQUEE SECTION -->
    <section class="relative overflow-hidden pt-28 pb-10 bg-white">

        {{-- Background --}}
        <div class="absolute inset-0">

            <img src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1920&q=80"
                alt="Shipping"
                class="w-full h-full object-cover opacity-20">

            <div class="absolute inset-0 bg-gradient-to-r from-[#01569F]/95 to-slate-900/95"></div>

        </div>

        {{-- CONTENT --}}
        <div class="relative z-10 max-w-6xl mx-auto px-4 text-center">

            <h2 class="text-4xl md:text-6xl font-black text-white leading-tight mb-6">

                Ready to Ship?

            </h2>

            <p class="text-lg md:text-xl text-slate-300 leading-9 max-w-3xl mx-auto mb-12">

                Get a personalized quote in minutes. Our logistics experts
                are standing by to optimize your supply chain operations
                with secure and reliable shipping solutions.

            </p>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-5 mb-20">

                <a href="{{ url('/') }}?quote=1#contact-section"
                    class="no-underline inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-[#FDCA31] text-slate-900 font-extrabold text-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white">

                    Get Free Quote

                    <svg class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">

                        <path stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 8l4 4m0 0l-4 4m4-4H3"></path>

                    </svg>

                </a>

                <a href="{{ url('/') }}#contact-section"
                    class="no-underline inline-flex items-center justify-center px-10 py-5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-white font-bold text-lg transition-all duration-300 hover:bg-white/20">

                    Contact

                </a>

            </div>

        </div>

        {{-- MARQUEE --}}
        <div class="relative z-10 overflow-hidden py-6">

            <div class="gts-tailwind-marquee flex items-center w-max">

                @foreach($service['marquee'] as $item)

                <div class="flex items-center gap-4 pr-20 whitespace-nowrap">

                    <i class="{{ $item['icon'] }}
                          text-white/20
                          text-4xl md:text-6xl"></i>

                    <span class="text-4xl md:text-6xl
                             font-black
                             leading-[1.3]
                             text-white/20">

                        {{ $item['text'] }}

                    </span>

                </div>

                @endforeach

                @foreach($service['marquee'] as $item)

                <div class="flex items-center gap-4 pr-20 whitespace-nowrap py-3">

                    <i class="{{ $item['icon'] }}
                          text-white/20
                          text-4xl md:text-6xl"></i>

                    <span class="text-4xl md:text-6xl
                             font-black
                             text-white/20">

                        {{ $item['text'] }}

                    </span>

                </div>

                @endforeach

            </div>

        </div>

    </section>

    <!-- GTS SERVICE FAQ SECTION -->
    <section class="bg-[#f7f9fc] pt-24 pb-0 px-5">

        <div class="max-w-[1300px] mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-16 items-start">

            {{-- LEFT --}}
            <div class="lg:sticky lg:top-[120px]">

                <span class="inline-block
                         px-5 py-2.5
                         rounded-full
                         bg-[#01569F]/10
                         text-[#01569F]
                         text-sm
                         font-bold
                         mb-7">

                    Support Center

                </span>

                <h2 class="text-[42px]
                       md:text-[62px]
                       leading-none
                       font-black
                       text-slate-900
                       mb-6">

                    Your questions,

                    <span class="block text-[#01569F]">
                        answered
                    </span>

                </h2>

                <p class="text-[17px]
                      leading-[1.9]
                      text-slate-600
                      max-w-[520px]
                      mb-9">

                    Find answers to the most common questions about freight forwarding,
                    customs clearance, shipping solutions, and logistics support.

                </p>

                <a href="{{ url('/') }}#contact-section"
                    class="inline-flex
                      items-center
                      justify-center
                      px-8 py-4
                      rounded-full
                      bg-slate-900
                      text-white
                      font-bold
                      no-underline
                      transition-all
                      duration-300
                      hover:bg-[#01569F]
                      hover:text-white">

                    Contact Support

                </a>

                <div class="flex items-center gap-3 mt-6 text-slate-500 text-[15px]">

                    <span>Avg. response: 2h</span>

                    <span class="w-[5px] h-[5px] rounded-full bg-slate-300"></span>

                    <span>24/7 Available</span>

                </div>

            </div>

            {{-- RIGHT --}}
            <div class="flex flex-col gap-5">

                @foreach($service['faq'] as $index => $faq)

                <div class="gtsx-card
                        rounded-[26px]
                        border
                        border-slate-200
                        bg-[#f8fbff]
                        overflow-hidden
                        transition-all
                        duration-300
                        hover:-translate-y-1
                        hover:shadow-[0_18px_40px_rgba(2,6,23,0.08)]
                        {{ $index == 0 ? 'active border-[#01569F]' : '' }}">

                    {{-- QUESTION --}}
                    <button class="gtsx-question
                               w-full
                               bg-transparent
                               border-0
                               p-6
                               flex
                               items-center
                               justify-between
                               gap-5
                               text-left
                               cursor-pointer">

                        <div class="flex items-center gap-5 flex-1">

                            {{-- ICON --}}
                            <div class="w-[58px]
                                    h-[58px]
                                    rounded-[18px]
                                    bg-[#01569F]
                                    text-white
                                    flex
                                    items-center
                                    justify-center
                                    text-2xl
                                    flex-shrink-0">

                                @switch($index)

                                @case(0)
                                <i class="fa-solid fa-earth-americas"></i>
                                @break

                                @case(1)
                                <i class="fa-solid fa-plane"></i>
                                @break

                                @case(2)
                                <i class="fa-solid fa-file-shield"></i>
                                @break

                                @case(3)
                                <i class="fa-solid fa-truck-fast"></i>
                                @break

                                @default
                                <i class="fa-solid fa-circle-question"></i>

                                @endswitch

                            </div>

                            {{-- TITLE --}}
                            <span class="text-[18px]
                                     font-extrabold
                                     leading-[1.5]
                                     text-slate-900">

                                {{ $faq['question'] }}

                            </span>

                        </div>

                        {{-- PLUS --}}
                        <div class="gtsx-plus
                                w-[42px]
                                h-[42px]
                                rounded-full
                                bg-slate-100
                                flex
                                items-center
                                justify-center
                                text-[28px]
                                text-slate-500
                                flex-shrink-0
                                transition-all
                                duration-300">

                            +

                        </div>

                    </button>

                    {{-- ANSWER --}}
                    <div class="gtsx-answer {{ $index == 0 ? 'block' : 'hidden' }}">

                        <div class="px-6 pb-7 pl-[100px]
                                text-[15px]
                                leading-[1.9]
                                text-slate-600">

                            {{ $faq['answer'] }}

                        </div>

                    </div>

                </div>

                @endforeach

            </div>

        </div>

    </section>

    @include('partials.whatsapp-chat')

</main>

@endsection