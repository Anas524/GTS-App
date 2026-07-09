<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function show($slug)
    {
        $services = [

            'freight-forwarding' => [

                'title' => 'Freight Forwarding Services',

                'image' =>
                'images/services/freight-forwarding.webp',

                'video' => 'https://www.pexels.com/download/video/6618337/',

                'alt' =>
                'Global freight forwarding cargo transportation and logistics services',

                'description' =>
                'Reliable global freight forwarding solutions with secure international cargo handling and customs support.',

                'full_description' =>
                'We specialize in freight forwarding, ensuring seamless and efficient transportation of goods across air, sea, and land. Freight forwarding is the backbone of global trade, involving the coordination and management of shipments from origin to destination. It includes logistics planning, customs clearance, warehousing, and cargo tracking to ensure a smooth supply chain. Our company leverages advanced logistics solutions to streamline freight operations, offering cost-effective, timely, and secure shipping for businesses worldwide.',

                'marquee' => [

                    [
                        'icon' => 'fa-solid fa-earth-americas',
                        'text' => 'Global Coverage'
                    ],

                    [
                        'icon' => 'fa-solid fa-plane',
                        'text' => 'Air Freight'
                    ],

                    [
                        'icon' => 'fa-solid fa-ship',
                        'text' => 'Sea Freight'
                    ],

                    [
                        'icon' => 'fa-solid fa-box',
                        'text' => 'Cargo Handling'
                    ],

                    [
                        'icon' => 'fa-solid fa-route',
                        'text' => 'Supply Chain'
                    ]
                ],

                'why_choose' => [

                    [

                        'icon' => 'fa-solid fa-earth-americas',

                        'title' => 'Global Reach',

                        'desc' =>
                        'Extensive logistics network ensuring smooth international shipping.'
                    ],

                    [

                        'icon' => 'fa-solid fa-box',

                        'title' => 'Secure Cargo Handling',

                        'desc' =>
                        'Advanced shipment handling systems for safe transportation.'
                    ],

                    [

                        'icon' => 'fa-solid fa-file-shield',

                        'title' => 'Customs Expertise',

                        'desc' =>
                        'Professional customs clearance and documentation support.'
                    ],

                    [

                        'icon' => 'fa-solid fa-clock',

                        'title' => 'On-Time Delivery',

                        'desc' =>
                        'Fast and reliable freight operations with optimized transit times.'
                    ],

                    [

                        'icon' => 'fa-solid fa-route',

                        'title' => 'End-to-End Logistics',

                        'desc' =>
                        'Complete logistics support from pickup to final delivery.'
                    ],

                    [

                        'icon' => 'fa-solid fa-chart-line',

                        'title' => 'Cost Efficiency',

                        'desc' =>
                        'Optimized freight solutions that reduce shipping expenses.'
                    ]
                ],

                'faq' => [

                    [
                        'question' =>
                        'What is freight forwarding?',

                        'answer' =>
                        'Freight forwarding manages cargo transportation through air, sea, and land logistics including customs clearance, shipment coordination, and cargo tracking.'
                    ],

                    [
                        'question' =>
                        'Do you provide international shipping support?',

                        'answer' =>
                        'Yes, GTS offers reliable international freight forwarding solutions with global logistics coverage and secure cargo handling.'
                    ],

                    [
                        'question' =>
                        'Can you handle customs clearance and documentation?',

                        'answer' =>
                        'Absolutely. Our team manages customs documentation, cargo compliance, and clearance procedures for smooth international shipping.'
                    ],

                    [
                        'question' =>
                        'Do you provide end-to-end logistics support?',

                        'answer' =>
                        'Yes, we offer complete logistics solutions including cargo pickup, freight coordination, customs clearance, warehousing, and final delivery support.'
                    ]

                ],
            ],

            'air-freight' => [

                'title' => 'Air Freight Services',

                'subtitle' =>
                'Fast and secure international air cargo logistics.',

                'image' =>
                'images/services/air-freight.webp',

                'video' =>
                'https://www.vecteezy.com/video/7658090-uploading-cargo-onboard-the-aircraft',

                'alt' => 'International air freight and cargo shipping services',

                'description' =>
                'Fast international air freight and air cargo services with reliable delivery, customs support, and global logistics coverage.',

                'features' => [

                    'Express Cargo Delivery',
                    'Airport Customs Support',
                    'Priority Air Shipping',
                    'Worldwide Air Cargo',
                    'Time-Sensitive Freight',
                    'Secure Air Logistics'
                ]
            ],

            'sea-freight' => [

                'title' => 'Sea Freight Solutions',

                'subtitle' =>
                'Efficient global container shipping and ocean freight.',

                'image' =>
                'images/services/sea-freight.webp',

                'video' =>
                'https://videos.pexels.com/video-files/854118/854118-hd_1920_1080_25fps.mp4',

                'alt' => 'Global sea freight container shipping logistics solutions',

                'description' =>
                'Cost-effective LCL and FCL sea freight solutions for secure global container shipping and logistics operations.',

                'features' => [

                    'LCL & FCL Shipping',
                    'Global Port Connectivity',
                    'Container Freight Solutions',
                    'Bulk Cargo Shipping',
                    'Ocean Freight Management',
                    'Import & Export Support'
                ]
            ],

            'last-mile-delivery' => [

                'title' => 'Last-Mile Delivery',

                'subtitle' =>
                'Fast doorstep delivery solutions for modern commerce.',

                'image' =>
                'images/services/last-mile-delivery.webp',

                'video' =>
                'https://videos.pexels.com/video-files/4246205/4246205-hd_1920_1080_25fps.mp4',

                'alt' => 'Fast last mile delivery and shipment distribution services',

                'description' =>
                'Efficient last-mile delivery services with secure shipment handling and fast customer delivery operations.',

                'features' => [

                    'Doorstep Delivery',
                    'Fast Shipment Dispatch',
                    'Real-Time Tracking',
                    'Secure Package Handling',
                    'Urban Logistics',
                    'Customer Delivery Support'
                ]
            ],

            'warehousing-storage' => [

                'title' => 'Warehousing & Storage',

                'subtitle' =>
                'Smart inventory storage and warehouse logistics solutions.',

                'image' =>
                'images/services/warehousing-storage.webp',

                'video' =>
                'https://videos.pexels.com/video-files/7578552/7578552-hd_1920_1080_25fps.mp4',

                'alt' => 'Modern warehousing and inventory storage logistics solutions',

                'description' =>
                'Professional warehousing and storage solutions for inventory management, distribution, and supply chain operations.',

                'features' => [

                    'Inventory Management',
                    'Secure Warehousing',
                    'Distribution Solutions',
                    'Storage Optimization',
                    'Supply Chain Support',
                    'Warehouse Operations'
                ]
            ],

            'amazon-fba-prep' => [

                'title' => 'Amazon FBA Prep & Labeling',

                'subtitle' =>
                'Complete Amazon FBA preparation and logistics support.',

                'image' =>
                'images/services/amazon-fba.webp',

                'video' =>
                'https://videos.pexels.com/video-files/5077069/5077069-hd_1920_1080_25fps.mp4',

                'alt' => 'Amazon FBA preparation and labeling logistics services',

                'description' =>
                'Professional Amazon FBA preparation, labeling, packaging, and shipment solutions for ecommerce sellers.',

                'features' => [

                    'FBA Labeling',
                    'Product Packaging',
                    'Inventory Prep',
                    'Barcode Management',
                    'Amazon Compliance',
                    'Shipment Coordination'
                ]
            ],

            'cod-services' => [

                'title' => 'Cash on Delivery (COD)',

                'subtitle' =>
                'Reliable COD logistics and payment collection support.',

                'image' =>
                'images/services/cod-services.webp',

                'video' =>
                'https://videos.pexels.com/video-files/4246266/4246266-hd_1920_1080_25fps.mp4',

                'alt' => 'Cash on delivery COD logistics and shipment services',

                'description' =>
                'Flexible cash-on-delivery logistics services with secure payment handling and shipment management.',

                'features' => [

                    'COD Shipment Handling',
                    'Payment Collection',
                    'Secure Delivery Support',
                    'Order Fulfillment',
                    'Customer Delivery Tracking',
                    'Efficient Logistics Operations'
                ]
            ],

            'customs-clearance' => [

                'title' => 'Customs Clearance',

                'subtitle' =>
                'Smooth customs documentation and cargo clearance support.',

                'image' =>
                'images/services/customs-clearance.webp',

                'video' =>
                'https://videos.pexels.com/video-files/5532775/5532775-hd_1920_1080_25fps.mp4',

                'alt' => 'International customs clearance and cargo documentation services',

                'description' =>
                'Professional customs clearance services with accurate documentation and international shipping compliance.',

                'features' => [

                    'Import Documentation',
                    'Export Clearance',
                    'Cargo Compliance',
                    'Customs Processing',
                    'International Trade Support',
                    'Fast Cargo Release'
                ]
            ],

            'ecommerce-fulfillment' => [

                'title' => 'E-Commerce Fulfillment',

                'subtitle' =>
                'End-to-end ecommerce logistics and order fulfillment.',

                'image' =>
                'images/services/ecommerce-fulfillment.webp',

                'video' =>
                'https://videos.pexels.com/video-files/5077078/5077078-hd_1920_1080_25fps.mp4',

                'alt' => 'Ecommerce fulfillment and order processing logistics services',

                'description' =>
                'Complete ecommerce fulfillment services for order processing, inventory handling, and global shipping.',

                'features' => [

                    'Order Processing',
                    'Inventory Handling',
                    'Packaging Solutions',
                    'Global Shipping',
                    'Fulfillment Operations',
                    'Ecommerce Logistics'
                ]
            ],

            'international-domestic-shipping' => [

                'title' => 'International & Domestic Shipping',

                'subtitle' =>
                'Reliable shipping solutions across local and global markets.',

                'image' =>
                'images/services/international-shipping.webp',

                'video' =>
                'https://videos.pexels.com/video-files/4488769/4488769-hd_1920_1080_25fps.mp4',

                'alt' => 'International and domestic cargo shipping logistics services',

                'description' =>
                'Reliable international and domestic shipping solutions with secure worldwide cargo delivery support.',

                'features' => [

                    'Domestic Cargo Delivery',
                    'International Shipping',
                    'Global Logistics Support',
                    'Secure Cargo Transport',
                    'Fast Shipment Operations',
                    'Worldwide Distribution'
                ]
            ],
        ];

        if (!isset($services[$slug])) {
            abort(404);
        }

        $service = $services[$slug];

        return view('service-detail', compact('service'));
    }
}
